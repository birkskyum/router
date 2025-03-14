import * as Solid from 'solid-js'
import { MetaProvider } from '@solidjs/meta'
import { Asset } from './Asset'
import { useRouter } from './useRouter'
import { useRouterState } from './useRouterState'
import type { RouterManagedTag, RouterState } from '@tanstack/router-core'

// New function that works directly with router state without requiring hooks
export const getTagsFromState = (state: RouterState): Array<RouterManagedTag> => {
  // Process meta tags
  const processMetaTags = (): Array<RouterManagedTag> => {
    const resultMeta: Array<RouterManagedTag> = []
    const metaByAttribute: Record<string, true> = {}
    let title: RouterManagedTag | undefined
    
    // Get all meta from matches
    const metaFromMatches = state.matches.map((match) => match.meta!).filter(Boolean)
    
    ;[...metaFromMatches].reverse().forEach((metas) => {
      ;[...metas].reverse().forEach((m) => {
        if (!m) return

        if (m.title) {
          if (!title) {
            title = {
              tag: 'title',
              children: m.title,
            }
          }
        } else {
          const attribute = m.name ?? m.property
          if (attribute) {
            if (metaByAttribute[attribute]) {
              return
            } else {
              metaByAttribute[attribute] = true
            }
          }

          resultMeta.push({
            tag: 'meta',
            attrs: {
              ...m,
            },
          })
        }
      })
    })

    if (title) {
      resultMeta.push(title)
    }

    resultMeta.reverse()
    return resultMeta
  }

  // Process links
  const processLinks = (): Array<RouterManagedTag> => {
    return state.matches
      .map((match) => match.links!)
      .filter(Boolean)
      .flat(1)
      .map((link) => ({
        tag: 'link',
        attrs: {
          ...link,
          // Add high priority for stylesheets
          ...(link && link.rel === 'stylesheet' ? { 
            fetchpriority: 'high',
            importance: 'high' 
          } : {})
        },
      })) as Array<RouterManagedTag>
  }

  // Process preloads (this requires the router object, will be handled differently)
  const processPreloads = (router: any): Array<RouterManagedTag> => {
    if (!router || !router.ssr || !router.ssr.manifest) {
      return []
    }
    
    const preloadMeta: Array<RouterManagedTag> = []

    state.matches
      .map((match) => router.looseRoutesById && router.looseRoutesById[match.routeId])
      .filter(Boolean)
      .forEach((route) =>
        router.ssr?.manifest?.routes[route.id]?.preloads
          ?.filter(Boolean)
          .forEach((preload: string) => {
            preloadMeta.push({
              tag: 'link',
              attrs: {
                rel: 'modulepreload',
                href: preload,
              },
            })
          }),
      )

    return preloadMeta
  }

  // Process head scripts
  const processHeadScripts = (): Array<RouterManagedTag> => {
    return (
      state.matches
        .map((match) => match.headScripts!)
        .flat(1)
        .filter(Boolean) as Array<RouterManagedTag>
    ).map(({ children, ...script }) => ({
      tag: 'script',
      attrs: {
        ...script,
      },
      children,
    }))
  }

  // Prioritize CSS - put stylesheets first
  const allTags = [...processMetaTags()];
  const links = processLinks();
  
  // Split links by type to prioritize CSS
  const cssLinks = links.filter(link => 
    link.attrs && link.attrs.rel === 'stylesheet'
  );
  
  const otherLinks = links.filter(link => 
    !link.attrs || link.attrs.rel !== 'stylesheet'
  );
  
  // Return all tags in the desired order
  return uniqBy(
    [
      ...cssLinks,
      ...allTags,
      ...otherLinks,
      ...processHeadScripts(),
    ],
    (d) => {
      return JSON.stringify(d)
    },
  )
}

// The original useTags hook, now implemented in terms of the pure function
export const useTags = () => {
  const router = useRouter()

  const routerState = useRouterState({
    select: state => state
  })
  
  // When used within a RouterProvider, use the router state
  return Solid.createMemo(() => {
    const state = routerState()
    
    // Process the state into tags
    const tags = getTagsFromState(state)
    
    // Add in preloads from the router (only possible with router instance)
    const preloads = router && router.ssr ? 
      processRouterPreloads(router, state) : []
    
    // This ensures proper insertion order for CSS priority
    const cssIndex = tags.findIndex(tag => 
      tag.tag === 'link' && tag.attrs && tag.attrs.rel === 'stylesheet'
    )
    
    if (cssIndex >= 0 && preloads.length > 0) {
      // Insert preloads right after CSS links
      return [
        ...tags.slice(0, cssIndex + 1),
        ...preloads,
        ...tags.slice(cssIndex + 1)
      ]
    }
    
    return [...tags, ...preloads]
  })
}

// Helper to process preloads specifically from router
function processRouterPreloads(router: any, state: RouterState): Array<RouterManagedTag> {
  if (!router || !router.ssr || !router.ssr.manifest) {
    return []
  }
  
  const preloadMeta: Array<RouterManagedTag> = []

  state.matches
    .map((match) => router.looseRoutesById && router.looseRoutesById[match.routeId])
    .filter(Boolean)
    .forEach((route) =>
      router.ssr?.manifest?.routes[route.id]?.preloads
        ?.filter(Boolean)
        .forEach((preload: string) => {
          preloadMeta.push({
            tag: 'link',
            attrs: {
              rel: 'modulepreload',
              href: preload,
            },
          })
        }),
    )

  return preloadMeta
}

/**
 * @description The `HeadContent` component is used to render meta tags, links, and scripts for the current route.
 * It should be rendered in the `<head>` of your document.
 */
export function HeadContent() {
  const tags = useTags()
  return (
    <MetaProvider>
      {tags().map((tag) => (
        <Asset {...tag} />
      ))}
    </MetaProvider>
  )
}

// Creates a standalone head content component that accepts router state directly
export function createHeadContent(routerState: RouterState) {
  return () => {
    const tags = getTagsFromState(routerState)
    return (
      <MetaProvider>
        {tags.map((tag) => (
          <Asset {...tag} />
        ))}
      </MetaProvider>
    )
  }
}

function uniqBy<T>(arr: Array<T>, fn: (item: T) => string) {
  const seen = new Set<string>()
  return arr.filter((item) => {
    const key = fn(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
