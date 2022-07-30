import { Cover } from '@psychedelic/cover';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { CANISTER_REG_EX, CANISTER_API_REG_EX, EXTENSION_REG_EX } from '../shared/constants';

class Background {
  constructor() {
    this.cover = new Cover(Ed25519KeyIdentity.generate());
    this.dataUpdated = false;
    this.canistersByInitiator = {};
  }
  
  requestHandler = async (details) => {
    const match = CANISTER_REG_EX.exec(details.url) || CANISTER_API_REG_EX.exec(details.url)
    const fromExtension = EXTENSION_REG_EX.test(details.initiator)
  
    // Return if request is not related to canister or made from extension
    if(match === null || fromExtension) return;
    
    const canisterId = match[2];
    const initiator = details.initiator === null ? "Unknown" : details.initiator
  
    // Return if verified in the past
    if(this.canistersByInitiator[initiator] === undefined) {
      this.canistersByInitiator[initiator] = {[canisterId]: {}}
    } else if(this.canistersByInitiator[initiator][canisterId] === undefined) {
      this.canistersByInitiator[initiator][canisterId] = {}
    } else {
      return
    }
  
    const verification = await this.cover.getVerificationByCanisterId(Principal.fromText(canisterId));

    // Get hash on IC if the canister is registered on Cover
    if(verification !== undefined) {
      let icHash
      try {
        icHash = await this.cover.getICHash(Principal.fromText(canisterId))
      } catch(e) {
        console.log(`GET_IC_HASH_FAILED canister id: ${canisterId} ${e}`)
        icHash = null
      }
      
      // Omit canister_id and updated_by that data type lead error when saving to the storage
      const {canister_id, updated_by, ...omittedVerification} = verification
      this.canistersByInitiator[initiator][canisterId] = Object.assign(omittedVerification, {ic_hash: icHash, canister_id: canisterId})
    }
    console.log("Fetched a new canister: ", canisterId)
    this.dataUpdated = true
  }
}

const background = new Background();
export default background;