import type { AnyRouteMatch, AnyRouter } from '@tanstack/react-router'
import { useStyles } from './useStyles'
import React from 'react'
import { clsx as cx } from 'clsx'

function formatTime(ms: number) {
  const units = ['s', 'min', 'h', 'd']
  const values = [ms / 1000, ms / 60000, ms / 3600000, ms / 86400000]

  let chosenUnitIndex = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i]! < 1) break
    chosenUnitIndex = i
  }

  const formatter = new Intl.NumberFormat(navigator.language, {
    compactDisplay: 'short',
    notation: 'compact',
    maximumFractionDigits: 0,
  })

  return formatter.format(values[chosenUnitIndex]!) + units[chosenUnitIndex]
}

export function AgeTicker({
  match,
  router,
}: {
  match?: AnyRouteMatch
  router: AnyRouter
}) {
  const styles = useStyles()
  const rerender = React.useReducer(
    () => ({}),
    () => ({}),
  )[1]

  React.useEffect(() => {
    const interval = setInterval(() => {
      rerender()
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [rerender])

  if (!match) {
    return null
  }

  const route = router.looseRoutesById[match.routeId]!

  if (!route.options.loader) {
    return null
  }

  const age = Date.now() - match.updatedAt
  const staleTime =
    route.options.staleTime ?? router.options.defaultStaleTime ?? 0
  const gcTime =
    route.options.gcTime ?? router.options.defaultGcTime ?? 30 * 60 * 1000

  return (
    <div className={cx(styles.ageTicker(age > staleTime))}>
      <div>{formatTime(age)}</div>
      <div>/</div>
      <div>{formatTime(staleTime)}</div>
      <div>/</div>
      <div>{formatTime(gcTime)}</div>
    </div>
  )
}
