import { Web3Provider } from "@ethersproject/providers";
import { ImmutableXClient } from "@imtbl/imx-sdk";
import { useWeb3React } from "@web3-react/core";
import { Field, Form, Formik, FormikErrors, FormikProps, useField, useFormikContext } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { CryptoNetwork } from "../../../Models/CryptoNetwork";
import { Currency } from "../../../Models/Currency";
import { Exchange } from "../../../Models/Exchange";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { SelectMenuItem } from "../../Select/selectMenuItem";
import Image from 'next/image'
import SwapButton from "../../buttons/swapButton";
import { useSwapDataUpdate } from "../../../context/swap";
import Select from "../../Select/Select";
import React from "react";
import { useFormWizardaUpdate } from "../../../context/formWizardProvider";
import { ExchangeAuthorizationSteps, FormWizardSteps } from "../../../Models/Wizard";
import TokenService from "../../../lib/TokenService";
import { useUserExchangeDataUpdate } from "../../../context/userExchange";
import axios from "axios";
import AmountAndFeeDetails from "../../Disclosure/amountAndFeeDetailsComponent";
import ConnectImmutableX from "./ConnectImmutableX";
import ConnectDeversifi from "../../ConnectDeversifi";
import toast from "react-hot-toast";
import { InjectedConnector } from "@web3-react/injected-connector";
import { isValidAddress } from "../../../lib/addressValidator";
import { clearTempData, getTempData } from "../../../lib/openLink";
import NumericInput from "../../Input/NumericInput";
import AddressInput from "../../Input/AddressInput";
import { classNames } from "../../utils/classNames";
import KnownIds from "../../../lib/knownIds";
import { LayerSwapSettings } from "../../../Models/LayerSwapSettings";
import MainStepValidation from "../../../lib/mainStepValidator";

const CurrenciesField: FC = () => {
    const {
        values: { network, currency, exchange },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"
    const { data } = useSettingsState();

    const currencyMenuItems: SelectMenuItem<Currency>[] = network ? data.currencies
        .filter(x => x.network_id === network?.baseObject?.id && x?.exchanges?.some(e => e.exchange_id === exchange?.baseObject?.id))
        .map(c => ({
            baseObject: c,
            id: c.id,
            name: c.asset,
            order: c.order,
            imgSrc: c.logo_url,
            isAvailable: c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
            isEnabled: c.is_enabled,
            isDefault: c.is_default,
        })).sort(sortingByOrder)
        : []

    // ?.sort((x, y) => (Number(y.baseObject.is_default) - Number(x.baseObject.is_default) + (Number(y.baseObject.is_default) - Number(x.baseObject.is_default))))

    useEffect(() => {
        if (network && !currency) {
            // const alternativeToSelectedValue = currency && currencyMenuItems?.find(c => c.name === currency.name)
            const default_currency = data.currencies.sort((x, y) => Number(y.is_default) - Number(x.is_default)).find(c => c.is_enabled && c.network_id === network.baseObject.id && c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id))
            // if(alternativeToSelectedValue){
            //     setFieldValue(name, alternativeToSelectedValue)
            // }
            // else{
            if (default_currency) {
                const defaultValue: SelectMenuItem<Currency> = {
                    baseObject: default_currency,
                    id: default_currency.id,
                    name: default_currency.asset,
                    order: default_currency.order,
                    imgSrc: default_currency.logo_url,
                    isAvailable: default_currency.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
                    isEnabled: default_currency.is_enabled,
                    isDefault: default_currency.is_default,
                }
                setFieldValue(name, defaultValue)
            }
            else {
                setFieldValue(name, null)
            }

            // }
        }

    }, [network, exchange, currency, data.currencies, data.exchanges])

    return (<>
        <Field disabled={!currencyMenuItems?.length} name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} smallDropdown={true} />
    </>)
};

const ExchangesField = React.forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, currency },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = 'exchange'
    const settings = useSettingsState();

    const exchangeMenuItems: SelectMenuItem<Exchange>[] = settings.data.exchanges
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.name,
            order: e.order,
            imgSrc: e.logo_url,
            isAvailable: true, //currency?.baseObject?.exchanges?.some(ce => ce.exchangeId === e.id),
            isEnabled: e.is_enabled,
            isDefault: e.is_default
        })).sort(sortingByOrder);

    return (<>
        <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
            From
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${!exchange ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name={name} placeholder="Choose exchange" values={exchangeMenuItems} label="From" value={exchange} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});

const NetworkField = React.forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, network },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = "network"
    const { lockNetwork } = useQueryState()
    const { data } = useSettingsState();

    const networkMenuItems: SelectMenuItem<CryptoNetwork>[] = data.networks
        .map(n => ({
            baseObject: n,
            id: n.code,
            name: n.name,
            order: n.order,
            imgSrc: n.logo_url,
            isAvailable: !lockNetwork && !n.is_test_net,
            isEnabled: n.is_enabled && data.currencies.some(c => c.is_enabled && c.network_id === n.id && c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id)),
            isDefault: n.is_default
        })).sort(sortingByOrder);

    if (exchange && !network)
        ref.current?.focus()

    return (<>
        <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
            To
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${exchange && !network ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name={name} placeholder="Choose network" values={networkMenuItems} label="To" value={network} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});

const AmountField = React.forwardRef((props: any, ref: any) => {

    const { values: { currency } } = useFormikContext<SwapFormValues>();
    const name = "amount"
    const placeholder = currency ? `${currency?.baseObject?.min_amount} - ${currency?.baseObject?.max_amount}` : '0.01234'
    const step = 1 / Math.pow(10, currency?.baseObject?.decimals)

    return (<>
        <NumericInput
            label='Amount'
            disabled={!currency}
            placeholder={placeholder}
            min={currency?.baseObject?.min_amount}
            max={currency?.baseObject?.max_amount}
            step={isNaN(step) ? 0.01 : step}
            name={name}
            precision={currency?.baseObject.precision}
        >
            <CurrenciesField />
        </NumericInput>
    </>)
});

export default function MainStep() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { activate, active, account, chainId } = useWeb3React<Web3Provider>();

    // const { nextStep } = useWizardState();
    const { goToStep, setLoading: setLoadingWizard } = useFormWizardaUpdate<FormWizardSteps>()

    const [loading, setLoading] = useState(false)
    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectDeversifiIsOpen, setConnectDeversifiIsOpen] = useState(false);

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const query = useQueryState();
    const [addressSource, setAddressSource] = useState("")
    const { updateSwapFormData, clearSwap } = useSwapDataUpdate()
    const { getUserExchanges } = useUserExchangeDataUpdate()

    useEffect(() => {
        if (query.coinbase_redirect) {
            const temp_data = getTempData()
            const five_minutes_before = new Date(new Date().setMinutes(-5))
            if (new Date(temp_data?.date) >= five_minutes_before) {
                clearTempData()
                formikRef.current.setValues(temp_data.swap_data)
                updateSwapFormData(temp_data.swap_data)
                goToStep("SwapConfirmation")
            }
        }
        setTimeout(() => {
            setLoadingWizard(false)
        }, 500);
    }, [query])


    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;

        if (isImtoken || isTokenPocket) {
            if (isImtoken) {
                setAddressSource("imtoken");
            }
            else if (isTokenPocket) {
                setAddressSource("tokenpocket");
            }
            const injected = new InjectedConnector({
                // Commented to allow visitors from other networks to use this page
                //supportedChainIds: supportedNetworks.map(x => x.chain_id)
            });

            if (!active) {
                activate(injected, onerror => {
                    if (onerror.message.includes('user_canceled')) {
                        new Error('You canceled the operation, please refresh and try to reauthorize.')
                        return
                    }
                    else if (onerror.message.includes('Unsupported chain')) {
                        // Do nothing
                    }
                    else {
                        new Error(`Failed to connect: ${onerror.message}`)
                        return
                    }
                });
            }
        }
    }, [settings])

    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;
        setAddressSource((isImtoken && 'imtoken') || (isTokenPocket && 'tokenpocket') || query.addressSource)
    }, [query])

    let availableExchanges = settings.data.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))
    let availableNetworks = settings.data.networks
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))

    const availablePartners = Object.fromEntries(settings.data.partners.map(c => [c.name.toLowerCase(), c]));

    const immutableXApiAddress = 'https://api.x.immutable.com/v1';

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            setLoading(true)
            clearSwap()
            updateSwapFormData(values)
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                goToStep("Email")
            else {
                if (values.network.baseObject.id == KnownIds.Networks.ImmutableXId) {
                    const client = await ImmutableXClient.build({ publicApiUrl: immutableXApiAddress })
                    const isRegistered = await client.isRegistered({ user: values.destination_address })
                    if (!isRegistered) {
                        setConnectImmutableIsOpen(true)
                        setLoading(false)
                        return
                    }
                } else if (values.network.baseObject.id == KnownIds.Networks.RhinoFiMainnetId) {
                    const client = await axios.get(`https://api.deversifi.com/v1/trading/registrations/${values.destination_address}`)
                    const isRegistered = await client.data?.isRegisteredOnDeversifi
                    if (!isRegistered) {
                        setConnectDeversifiIsOpen(true);
                        setLoading(false)
                        return
                    }
                }
                const exchanges = (await getUserExchanges(accessToken))?.data
                const exchangeIsEnabled = exchanges?.some(e => e.exchange === values?.exchange?.id && e.is_enabled)
                if (values?.exchange?.baseObject?.authorization_flow === "none" || !values?.exchange?.baseObject?.authorization_flow || exchangeIsEnabled)
                    goToStep("SwapConfirmation")
                else
                    goToStep(ExchangeAuthorizationSteps[values?.exchange?.baseObject?.authorization_flow])
            }
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [updateSwapFormData])

    let destAddress: string = account || query.destAddress;
    let destNetwork: string = (chainId && settings.data.networks.find(x => x.chain_id == chainId)?.code) || query.destNetwork;


    let isPartnerAddress = addressSource && availablePartners[addressSource] && destAddress;
    let isPartnerWallet = isPartnerAddress && availablePartners[addressSource]?.is_wallet;

    let initialNetwork =
        availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isEnabled)

    const lockNetwork = !!chainId
    const sourceExchangeName = query.sourceExchangeName
    const lockAddress = !!account || query.lockAddress

    if (lockNetwork) {
        availableNetworks.forEach(x => {
            if (x != initialNetwork)
                x.isEnabled = false;
        })
    }

    let initialAddress = destAddress && initialNetwork && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";

    let initialExchange = availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase());
    const initialValues: SwapFormValues = { swapType: "offramp", amount: '', network: initialNetwork, destination_address: initialAddress, exchange: initialExchange };
    const exchangeRef: any = useRef();
    const networkRef: any = useRef();
    const addressRef: any = useRef();
    const amountRef: any = useRef();

    const closeConnectImmutableX = (address: string) => {
        setConnectImmutableIsOpen(false)
        if (address) {
            formValues.destination_address = address;
        }
    }
    const closeConnectDeversifi = () => {
        setConnectDeversifiIsOpen(false)
    }
    return <>
        <ConnectImmutableX isOpen={connectImmutableIsOpen} swapFormData={formValues} onClose={closeConnectImmutableX} />
        <ConnectDeversifi isOpen={connectDeversifiIsOpen} swapFormData={formValues} onClose={closeConnectDeversifi} />
        <Formik
            enableReinitialize={true}
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation(formikRef, addressRef, settings, amountRef)}
            onSubmit={handleSubmit}
        >
            {({ values, errors }) => (
                <Form className="h-full">
                    <div className="px-8 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex flex-col justify-between w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0 mb-3.5 leading-4">
                                <div className="flex flex-col md:w-80 w-full">
                                    {
                                        <ExchangesField ref={exchangeRef} />
                                    }
                                </div>
                                <div className="flex flex-col md:w-80 w-full">
                                    {
                                        <NetworkField ref={networkRef} />
                                    }
                                </div>

                            </div>
                            <div className="w-full mb-3.5 leading-4">
                                <label htmlFor="destination_address" className="block font-normal text-pink-primary-300 text-sm">
                                    {`To ${values?.network?.name || ''} address`}
                                    {isPartnerWallet && <span className='truncate text-sm text-indigo-200'>({availablePartners[addressSource].name})</span>}
                                </label>
                                <div className="relative rounded-md shadow-sm mt-1.5">
                                    {isPartnerWallet &&
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Image className='rounded-md object-contain' src={availablePartners[addressSource].logo_url} width="24" height="24"></Image>
                                        </div>
                                    }
                                    <div>
                                        <AddressInput
                                            disabled={initialAddress != '' && lockAddress || (!values.network || !values.exchange)}
                                            name={"destination_address"}
                                            className={classNames(isPartnerWallet ? 'pl-11' : '', 'disabled:cursor-not-allowed h-12 leading-4 focus:ring-pink-primary focus:border-pink-primary block font-semibold w-full bg-darkblue-600 border-ouline-blue border rounded-md placeholder-gray-400 truncate')}
                                            ref={addressRef}
                                        />
                                    </div>
                                </div>
                            </div >
                            <div className="mb-6 leading-4">
                                <AmountField ref={amountRef} />
                            </div>

                            <div className="w-full">
                                <AmountAndFeeDetails amount={values?.amount} currency={values.currency?.baseObject} exchange={values.exchange?.baseObject} />
                            </div>
                        </div>
                        <div className="mt-6">
                            <SwapButton type='submit' isDisabled={errors.amount != null || errors.destination_address != null} isSubmitting={loading}>
                                {displayErrorsOrSubmit(errors)}
                            </SwapButton>
                        </div>
                    </div >
                </Form >
            )}
        </Formik >
    </>
}


function displayErrorsOrSubmit(errors: FormikErrors<SwapFormValues>): string {
    if (errors.amount) {
        return errors.amount;
    }
    else {
        return "Swap now";
    }
}

function sortingByOrder(x: any, y: any) {
    if (!y.isEnabled) {
        y.order += 100;
    } else if (!x.isEnabled) {
        x.order += 100;
    };
    return Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault) + x.order - y.order)
}