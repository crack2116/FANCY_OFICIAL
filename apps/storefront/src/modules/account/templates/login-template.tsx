"use client"

import { useState } from "react"

import Login from "@modules/account/components/login"
import Register from "@modules/account/components/register"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

/**
 * Sign-in / register switch.
 *
 * The whole area is a parallel-route slot (`@login`), so it renders ONLY when
 * there is no usable session. Signing in calls `redirect()` from the server
 * action, which is why there is no imperative navigation here.
 */
const LoginTemplate = ({ sessionExpired }: { sessionExpired: boolean }) => {
  const [currentView, setCurrentView] = useState(LOGIN_VIEW.SIGN_IN)

  return (
    <div className="w-full flex justify-center">
      <div
        className="w-full max-w-md rounded-3xl border border-[#eadfce] bg-white p-6 shadow-[var(--shadow-lift)] small:p-9"
        data-testid="login-card"
      >
        {currentView === LOGIN_VIEW.SIGN_IN ? (
          <Login
            setCurrentView={setCurrentView}
            sessionExpired={sessionExpired}
          />
        ) : (
          <Register setCurrentView={setCurrentView} />
        )}
      </div>
    </div>
  )
}

export default LoginTemplate