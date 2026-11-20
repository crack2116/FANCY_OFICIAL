import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="py-8 sm:py-12">
      <div className="site-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-10 items-start">
            <div className="flex flex-col gap-y-5 min-w-0">
              {!customer && <SignInPrompt />}
              <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-7 shadow-xs">
                <ItemsTemplate cart={cart} />
              </div>
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-6 lg:sticky lg:top-24">
                {cart && cart.region && (
                  <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-7 shadow-xs">
                    <Summary cart={cart} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
