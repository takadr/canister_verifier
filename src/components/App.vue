<template>
    <div class="wrapper">
        <div class="filter-area">
            <div>
                <h2>Canister Verifier {{manifest && manifest.version}}
                <span class="powered">Powered by <a href="https://app.covercode.ooo/" target="_blank">Cover</a></span>
                </h2>
            </div>
            <div>
                <button @click="this.toggleMonitoring" class="btn" :class="{'active': monitoring}">
                {{monitoring ? 'Stop monitoring' : 'Start monitoring'}}
                </button>
                <button @click="this.clearData" class="btn ml1">Clear Data</button>
            </div>
        </div>
        <table v-if="verificationInfos">
            <thead>
                <tr>
                    <th>Initiator <input type="text" class="text-field" v-model="initiatorFilter" /></th>
                    <th>Canisters <input type="text" class="text-field" v-model="canisterIdFilter" /></th>
                    <th>Cycles <a :disabled="updatingCycle" @click="this.updateCycleInfo" :class="{'rotate': updatingCycle}"><font-awesome-icon icon="fa-solid fa-arrow-rotate-right" /></a></th>
                    <th>Freezing Threshold <a :disabled="updatingCycle" @click="this.updateCycleInfo" :class="{'rotate': updatingCycle}"><font-awesome-icon icon="fa-solid fa-arrow-rotate-right" /></a></th>
                </tr>
            </thead>
            <tbody>
                <template v-for="([initiator, canisters], index) in this.getFilteredVerificationInfo()">
                    <tr v-for="([canisterId, canister], index) in this.getFilteredCanisters(canisters)">
                        <td :rowspan="this.getFilteredCanisters(canisters).length" v-if="index === 0" class="col-initiator">
                            <a @click="this.gotoOriginLink(initiator)" v-if="initiator !== 'undefined'">
                                {{initiator.replace(/^https?:\/\//, "")}}
                                <font-awesome-icon icon="fa-solid fa-up-right-from-square" />
                            </a>
                            <span v-else>{{initiator}}</span>
                        </td>
                        <td>
                            <div>
                                <span v-if="canister.wasm_hash === undefined" class="canister-verification">
                                    <font-awesome-icon icon="fa-solid fa-circle-question" size="lg" />
                                </span>
                                <span v-else-if="this.hashMatch(canister)" class="verified canister-verification" @click="this.gotoCoverPage(canisterId)">
                                    <font-awesome-icon icon="fa-solid fa-check-circle" size="lg" />
                                </span>
                                <span v-else class="invalid canister-verification">
                                    <font-awesome-icon icon="fa-solid fa-triangle-exclamation" size="lg" />
                                </span>
                                <span class="canister-name" :class="{'unknown': getCanisterName(canisterId, initiator) === 'Unknown'}">
                                    {{ getCanisterName(canisterId, initiator) }}
                                </span>
                                <span></span>
                                <span class="canister-id">
                                    <a class="copy" @click="this.copy($event, canisterId)">{{canisterId}} <font-awesome-icon icon="fa-solid fa-clipboard" /><font-awesome-icon icon="fa-solid fa-clipboard-check" /></a>
                                    <a class="ml1" :href="`https://icscan.io/canister/${canisterId}`" target="_blank">
                                        <font-awesome-icon icon="fa-solid fa-up-right-from-square" />
                                    </a>
                                </span>
                            </div>
                        </td>
                        <td>
                            <span v-if="cycleInfoByCanisterId[canisterId] && cycleInfoByCanisterId[canisterId]['cycles']">
                                {{Number(cycleInfoByCanisterId[canisterId]["cycles"]).toLocaleString()}}
                            </span>
                            <span v-else><font-awesome-icon icon="fa-solid fa-circle-question" size="lg" /></span>
                        </td>
                        <td>
                            <span v-if="cycleInfoByCanisterId[canisterId] && cycleInfoByCanisterId[canisterId]['settings']['freezing_threshold']">
                                {{Number(cycleInfoByCanisterId[canisterId]["settings"]["freezing_threshold"]).toLocaleString()}}
                            </span>
                            <span v-else><font-awesome-icon icon="fa-solid fa-circle-question" size="lg" /></span>
                        </td>
                    </tr>
                </template>
                
            </tbody>
        </table>
        <div v-else>
            <p class="has-text-center">No data</p>
        </div>
    </div>
</template>

<script>
    import { CycleChecker } from '../scripts/CycleChecker';
    import { getCanisterInfo, getMultipleCanisterInfo } from '@psychedelic/dab-js';
    import { EXTENSION_REG_EX } from '../shared/constants';

    export default {
        data() {
            return {
                verificationInfos: {},
                cycleInfoByCanisterId: {},
                metadataByCanisterId: {},
                initiatorFilter: "",
                canisterIdFilter: "",
                syncingData: false,
                updatingCycle: false,
                updatingMetadata: false,
                monitoring: false,
                manifest: null
            };
        },
        mounted() {
            setInterval(async () => {
                await this.updateMonitoringStatus();
                this.monitoring && !this.syncingData && this.syncData()
            }, 3000);

            this.updateMonitoringStatus();
            this.manifest = chrome.runtime.getManifest();
            chrome.storage.local.get(['canistersByInitiator', 'cycleInfoByCanisterId', 'metadataByCanisterId'], (data) => {
                this.verificationInfos = {...this.verificationInfos, ...data.canistersByInitiator}
                this.cycleInfoByCanisterId = {...this.cycleInfoByCanisterId, ...data.cycleInfoByCanisterId}
                this.metadataByCanisterId = {...this.metadataByCanisterId, ...data.metadataByCanisterId}
            });
        },
        methods: {
            copy(ev, canister) {
                navigator.clipboard.writeText(canister)
                if(!ev.target.classList.contains("copied")){
                    ev.target.classList.add("copied")
                    setTimeout(() => { ev.target.classList.remove("copied") }, 1000)
                }
            },
            getCanisterName(canisterId, initiator) {
                if(this.metadataByCanisterId[canisterId] && this.metadataByCanisterId[canisterId].name) {
                    return this.metadataByCanisterId[canisterId].name
                } else if (initiator && this.verificationInfos[initiator] && this.verificationInfos[initiator][canisterId] && this.verificationInfos[initiator][canisterId].canister_name) {
                    return this.verificationInfos[initiator][canisterId].canister_name
                } else {
                    return "Unknown"
                }
            },
            hashMatch(canisterInfo) {
                return canisterInfo.ic_hash 
                && canisterInfo.wasm_hash 
                && canisterInfo.ic_hash === canisterInfo.wasm_hash[0]
            },
            updateCycleInfo() {
                if(this.updatingCycle) return

                let canisterIds = []
                let promises = []
                Object.entries(this.verificationInfos).forEach((row) => {canisterIds = canisterIds.concat(Object.keys(row[1]))})
                canisterIds = Array.from(new Set(canisterIds))
                this.updatingCycle = true
                canisterIds.forEach((id) => {
                    promises.push(
                        new Promise((resolve, reject) => { 
                            return this.getCycles(id).then((res) => {
                                Object.assign(this.cycleInfoByCanisterId, {[id]: res})
                                resolve(true)
                            }).catch((e) => {
                                reject(e)
                            })
                        })
                    )
                })
                Promise.all(promises).then((results) => {
                    this.updatingCycle = false
                    chrome.storage.local.set({cycleInfoByCanisterId: {...this.cycleInfoByCanisterId}})
                }).catch((e) => {
                    this.updatingCycle = false
                })
            },
            updateMetadata() {
                if(this.updatingMetadata) return

                let canisterIds = []
                let promises = []
                Object.entries(this.verificationInfos).forEach((row) => {canisterIds = canisterIds.concat(Object.keys(row[1]))})
                canisterIds = Array.from(new Set(canisterIds))
                this.updatingMetadata = true
                canisterIds.forEach((id) => {
                    promises.push(
                        new Promise((resolve, reject) => { 
                            return getCanisterInfo({ canisterId: id }).then((metadata) => {
                                Object.assign(this.metadataByCanisterId, {[id]:  metadata === undefined ? {} : metadata})
                                return resolve()
                            }).catch((e) => reject(e));
                        })
                    )
                })
                Promise.all(promises).then((results) => {
                    this.updatingMetadata = false
                    chrome.storage.local.set({metadataByCanisterId: {...this.metadataByCanisterId}})
                }).catch((e) => {
                    this.updatingMetadata = false
                })
            },
            syncData() {
                this.syncingData = true
                chrome.runtime.sendMessage(
                    {
                        type: 'SYNC_DATA',
                        payload: {},
                    },
                    (response) => {
                        if(response.dataUpdated) {
                            chrome.storage.local.get(['canistersByInitiator'], (data) => {
                                this.verificationInfos = {...data.canistersByInitiator, ...response.verificationInfos}
                                chrome.storage.local.set({canistersByInitiator: this.verificationInfos})
                                this.updateMetadata()
                                this.updateCycleInfo()
                            });
                        } else {
                            console.log("Up-to-date")
                        }
                        this.syncingData = false
                    }
                );
            },
            getFilteredVerificationInfo() {
                if(this.initiatorFilter !== "") {
                    return Object.entries(this.verificationInfos).filter((entry)=>{return entry[0].includes(this.initiatorFilter)})
                } else {
                    return Object.entries(this.verificationInfos)
                }
            },
            getFilteredCanisters(canisters) {
                if(this.canisterIdFilter !== "") {
                    return Object.entries(canisters).filter((entry)=>{return entry[0].includes(this.canisterIdFilter)})
                } else {
                    return Object.entries(canisters)
                }
            },
            gotoOriginLink(origin) {
                const res = EXTENSION_REG_EX.exec(origin)
                const url = res === null ? origin : `chrome://extensions/?id=${res[2]}`
                chrome.tabs.create({url: url, active: true});
            },
            gotoCoverPage(canister) {
                chrome.tabs.create({url: `https://app.covercode.ooo/canister/${canister}`, active: true})
            },
            clearData() {
                chrome.runtime.sendMessage(
                    {
                        type: 'CREAR_DATA',
                        payload: {},
                    },
                    (response) => {
                    }
                );
                chrome.storage.local.set({canistersByInitiator: {}})
                this.verificationInfos = {}
            },
            toggleMonitoring() {
                chrome.runtime.sendMessage(
                    {
                        type: 'TOGGLE_MONITORING',
                        payload: {},
                    },
                    (response) => {
                        this.monitoring = response.isMonitoring
                    }
                );
            },
            async updateMonitoringStatus() {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage(
                        {
                            type: 'GET_MONITORING_STATUS',
                            payload: {},
                        },
                        (response) => {
                            console.log("isMonitoring", response.isMonitoring)
                            this.monitoring = response.isMonitoring
                            resolve()
                        }
                    );
                })
            },
            async getCycles(canisterId) {
                return await CycleChecker.check(canisterId)
            }
        }
    }
</script>

<style>
    .wrapper {
        padding: var(--cover-space-25) var(--cover-space-0) var(--cover-space-35) var(--cover-space-0);
        row-gap: var(--cover-space-30);
    }
    .col-initiator {
        width: 200px;
        white-space: unset;
    }
    .has-text-center {
        text-align: center;
    }
    .canister-verification {
        position: relative;
        display: inline-block;
        width: 20px;
    }
    .canister-verification.verified {
        color: var(--cover-colors-coverGreen);
        cursor: pointer;
    }
    .canister-verification.invalid {
        color: var(--cover-colors-coverRed);
        cursor: pointer;
    }
    .canister-verification.verified:hover:after,
    .canister-verification.invalid:hover:after{
        display: block;
        position: absolute;
        top: -25px;
        left: -20px;
        z-index: 100;
        background: var(--cover-colors-coverLightGray);
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
    }
    .canister-verification.verified:hover:after {
        content: "Verified";
    }
    .canister-verification.invalid:hover:after {
        content: "Invalid";
    }
    .canister-name {
        display: inline-block;
        width: 100px;
        overflow: hidden;
        white-space: nowrap;
        vertical-align: top;
        text-overflow: ellipsis;
    }
    .canister-id {
        display: inline-block;
    }
    .powered {
        padding-left: 0.5rem;
        font-size: 0.75rem;
        font-weight: normal;
        color: var(--cover-colors-coverLightGray);
    }
    .powered a {
        color: var(--cover-colors-coverLightGray);
    }
    .filter-area {
        padding: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .btn {
        all: unset;
        font-weight: var(--cover-fontWeights-normal);
        font-size: var(--cover-fontSizes-xs);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--cover-space-0) var(--cover-space-15);
        border-radius: var(--cover-radii-8);
        padding: 0.5rem;
    }
    .btn.active {
        color: var(--cover-colors-coverGreen);
        background-color: var(--cover-colors-coverDarkGreen);
    }
    .ml1 {
        margin-left: 1rem
    }
    .unknown {
        color: var(--cover-colors-coverLightGray);
    }
    .rotate {
        animation: 3s linear infinite rotation;
    }
    @keyframes rotation {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .copy .fa-clipboard-check {
        display: none;
    }
    .copy.copied .fa-clipboard {
        display: none;
    }
    .copy.copied .fa-clipboard-check{
        display: inline-block;
    }

</style>