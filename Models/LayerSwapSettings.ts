import { BlacklistedAddress } from "./BlacklistedAddress";
import { CryptoNetwork } from "./CryptoNetwork";
import { Currency } from "./Currency";
import { Exchange } from "./Exchange";
import { Partner } from "./Partner";


export class LayerSwapSettings {
    data: {
        exchanges: Exchange[];
        networks: CryptoNetwork[];
        currencies: Currency[];
        partners: Partner[];
        blacklistedAddresses: BlacklistedAddress[]
    }
}