import React, { useCallback, useEffect } from 'react'
import TokenService from '../lib/TokenService';

const AuthStateContext = React.createContext<any>(null);
const AuthDataUpdateContext = React.createContext<any>(null);


export type UpdateInterface = {
    updateEmail: (email: string) => void,
    updateAuthData: (data: any) => void,
    getAuthData: () => (AuthData | undefined)
    setCodeRequested(codeSubmitted: boolean): void;
}

export function AuthProvider({ children }) {

    const [email, setEmail] = React.useState<string | undefined>()
    const [authData, setAuthData] = React.useState<AuthData>({})
    const [codeRequested, setCodeRequested] = React.useState<boolean>(false)

    const setData = () => {
        setEmail(TokenService.getEmail())
        setAuthData(TokenService.getAuthData())
    }

    useEffect(setData, [])

    useEffect(() => {
        document.addEventListener(
            'storageChange',
            setData,
            false
        )
        return () => document.removeEventListener('storageChange', setData)
    }, [])

    const updateFns: UpdateInterface = {
        updateEmail: useCallback((email) => {
            TokenService.setEmail(email)
            setEmail(email)
        }, []),
        updateAuthData: useCallback((data) => {
            TokenService.setAuthData(data)
            setAuthData(data)
        }, []),
        getAuthData: useCallback(() => {
            return TokenService.getAuthData()
        }, []),
        setCodeRequested: useCallback((codeRequested: boolean) => setCodeRequested(codeRequested),[codeRequested])
    };

    return (
        <AuthStateContext.Provider value={{ email, authData, codeRequested }}>
            <AuthDataUpdateContext.Provider value={updateFns}>
                {children}
            </AuthDataUpdateContext.Provider>
        </AuthStateContext.Provider>
    )
}

export function useAuthState() {
    const data = React.useContext<{ authData: AuthData, email: string, codeRequested: boolean }>(AuthStateContext);

    if (data === undefined) {
        throw new Error('useAuthState must be used within a AuthStateProvider');
    }

    return data;
}


export function useAuthDataUpdate() {
    const updateFns = React.useContext<UpdateInterface>(AuthDataUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useAuthDataUpdate must be used within a AuthDataProvider');
    }

    return updateFns;
}

export type AuthData = {
    access_token?: string,
    expires_in?: number,
    refresh_token?: string,
    scope?: string,
    token_type?: string,
}