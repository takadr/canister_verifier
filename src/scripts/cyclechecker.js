import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const blackholeCanisterId = "e3mmv-5qaaa-aaaah-aadma-cai";
const icpHost = "https://ic0.app";
const agent = new HttpAgent({host: icpHost});
const responseFormat = {
    status: null,
    memory_size: null,
    cycles: null,
    settings: {
        freezing_threshold: null,
        controllers: [],
        module_hash: null,
        memory_allocation: null,
        compute_allocation: null
    }
}

const idlFactoryNFT = ({ IDL }) => {
    return IDL.Service({
        'availableCycles': IDL.Func([], [IDL.Nat], ['query']), // YUMI, EXT
        'getCycles': IDL.Func([], [IDL.Nat], ['query']), // CETO, CCC
        'get_cycles': IDL.Func([], [IDL.Nat], ['query']), // GIGA
        'stats' : IDL.Func(
          [],
          [
            IDL.Record({
              'cycles' : IDL.Nat,
              'total_transactions' : IDL.Nat,
              'total_unique_holders' : IDL.Nat,
              'total_supply' : IDL.Nat,
            }),
          ],
          ['query'],
        ), // JELLY
    });
  };

const idlFactoryBlackhole = ({ IDL }) => {
    return IDL.Service({
        'canister_status' : IDL.Func(
            [IDL.Record({ 'canister_id' : IDL.Principal })],
            [
              IDL.Record({
                'status' : IDL.Variant({
                  'stopped' : IDL.Null,
                  'stopping' : IDL.Null,
                  'running' : IDL.Null,
                }),
                'memory_size' : IDL.Nat,
                'cycles' : IDL.Nat,
                'settings' : IDL.Record({
                  'freezing_threshold' : IDL.Nat,
                  'controllers' : IDL.Vec(IDL.Principal),
                  'module_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
                  'memory_allocation' : IDL.Nat,
                  'compute_allocation' : IDL.Nat,
                }),
              }),
            ],
            [],
          ),
    });
}
const blackholeActor = Actor.createActor(idlFactoryBlackhole, {
    agent: agent,
    canisterId: blackholeCanisterId,
});

export class CycleChecker {
    static async check(canisterId) {
        const actor = Actor.createActor(idlFactoryNFT, {
            agent,
            canisterId,
        });
        try {
            const res = await blackholeActor.canister_status({canister_id: Principal.fromText(canisterId)})
            // Stringfy cycles and prune controllers to avoid Cannot serialize value to JSON
            res["settings"]["controllers"] = []
            res["settings"]["freezing_threshold"] = String(res["settings"]["freezing_threshold"])
            return {...res, ...{cycles: String(res.cycles)}}
        } catch(e) {
            // console.log(e)
            // console.log("Not black holed")
        }
        try {
            const res = await actor.stats();
            return Object.assign({...responseFormat}, {cycles: String(res.cycles)})
        } catch(e) {
            // console.log(e)
            // console.log("Not a Jelly NFT")
        }
        try {
            const res = await actor.availableCycles();
            return Object.assign({...responseFormat}, {cycles: String(res)})
        } catch(e) {
            // console.log(e)
            // console.log("Not a YUMI, EXT NFT")
        }
        try {
            const res = await actor.getCycles();
            return Object.assign({...responseFormat}, {cycles: String(res)})
        } catch(e) {
            // console.log(e)
            // console.log("Not a CETO, CCC NFT")
        }
        try {
            const res = await actor.get_cycles();
            return Object.assign({...responseFormat}, {cycles: String(res)})
        } catch(e) {
            // console.log(e)
            // console.log("Not a GIGA NFT")
        }
        
        return responseFormat;
    }
}