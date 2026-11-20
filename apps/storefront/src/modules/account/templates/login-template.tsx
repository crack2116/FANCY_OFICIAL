"use client"

import { useState } from "react"
import { clx } from "@modules/common/components/ui"
import { t } from "@lib/i18n/translations"
import Login from "@modules/account/components/login"
import Register from "@modules/account/components/register"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

type Props = {
  sessionExpired: boolean
  initialView?: LOGIN_VIEW
  onSuccess?: () => void
  showSwitcher?: boolean
}

/**
 * Sign-in / register switch.
 *
 * The whole area is a parallel-route slot (`@login`), so it renders ONLY when
 * there is no usable session.
 */
const LoginTemplate = ({
  sessionExpired,
  initialView = LOGIN_VIEW.SIGN_IN,
  onSuccess,
  showSwitcher = true,
}: Props) => {
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(initialView)

  return (
    <div className="w-full flex flex-col items-center">
      {showSwitcher ? (
        <div className="w-full max-w-sm grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
            className={clx(
              "py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center cursor-pointer",
              currentView === LOGIN_VIEW.SIGN_IN
                ? "bg-white text-[#F36F21] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            data-testid="tab-sign-in"
          >
            {t("account.login.title")}
          </button>
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
            className={clx(
              "py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center cursor-pointer",
              currentView === LOGIN_VIEW.REGISTER
                ? "bg-white text-[#F36F21] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            data-testid="tab-register"
          >
            {t("account.register.title")}
          </button>
        </div>
      ) : null}

      {currentView === LOGIN_VIEW.SIGN_IN ? (
        <Login
          setCurrentView={setCurrentView}
          sessionExpired={sessionExpired}
          onSuccess={onSuccess}
          showHeading={!showSwitcher}
        />
      ) : (
        <Register
          setCurrentView={setCurrentView}
          onSuccess={onSuccess}
          showHeading={!showSwitcher}
        />
      )}
    </div>
  )
}

export default LoginTemplate
