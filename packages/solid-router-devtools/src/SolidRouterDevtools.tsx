import { useRouter, useRouterState } from '@tanstack/solid-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools-core'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import type { AnyRouter, RouterState } from '@tanstack/solid-router'
import type { Component, JSX } from 'solid-js'

interface DevtoolsOptions {
  /**
   * Set this true if you want the dev tools to default to being open
   */
  initialIsOpen?: boolean
  /**
   * Use this to add props to the panel. For example, you can add className, style (merge and override default style), etc.
   */
  panelProps?: JSX.HTMLAttributes<HTMLDivElement>
  /**
   * Use this to add props to the close button. For example, you can add className, style (merge and override default style), onClick (extend default handler), etc.
   */
  closeButtonProps?: JSX.ButtonHTMLAttributes<HTMLButtonElement>
  /**
   * Use this to add props to the toggle button. For example, you can add className, style (merge and override default style), onClick (extend default handler), etc.
   */
  toggleButtonProps?: JSX.ButtonHTMLAttributes<HTMLButtonElement>
  /**
   * The position of the TanStack Router logo to open and close the devtools panel.
   * Defaults to 'bottom-left'.
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /**
   * Use this to render the devtools inside a different type of container element for a11y purposes.
   * Any string which corresponds to a valid intrinsic JSX element is allowed.
   * Defaults to 'footer'.
   */
  containerElement?: string | any
  /**
   * A boolean variable indicating if the "lite" version of the library is being used
   */
  router?: AnyRouter
  routerState?: RouterState<any>
  /**
   * Use this to attach the devtool's styles to specific element in the DOM.
   */
  shadowDOMTarget?: ShadowRoot
}

export const SolidRouterDevtools: Component<DevtoolsOptions> = (props) => {
  const usedProps = {
    ...props,
    router: props.router ?? useRouter(),
    routerState: props.routerState ?? useRouterState(),
  }

  let devToolRef: HTMLDivElement | undefined
  const [devtools] = createSignal(new TanStackRouterDevtools(usedProps))

  // Update devtools when props change
  createEffect(() => {
    devtools().setRouter(usedProps.router)
  })

  createEffect(() => {
    devtools().setRouterState(usedProps.routerState)
  })

  createEffect(() => {
    devtools().setOptions({
      initialIsOpen: usedProps.initialIsOpen,
      panelProps: usedProps.panelProps,
      closeButtonProps: usedProps.closeButtonProps,
      toggleButtonProps: usedProps.toggleButtonProps,
      position: usedProps.position,
      containerElement: usedProps.containerElement,
      shadowDOMTarget: usedProps.shadowDOMTarget,
    })
  })

  onMount(() => {
    if (devToolRef) {
      devtools().mount(devToolRef)

      onCleanup(() => {
        devtools().unmount()
      })
    }
  })

  return (
    <>
      <div ref={devToolRef} />
    </>
  )
}
