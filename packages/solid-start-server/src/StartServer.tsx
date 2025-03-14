// Import from solid-router in alphabetical order
import { Asset, RouterProvider, Scripts, getTagsFromState, useTags } from '@tanstack/solid-router'
import * as Solid from 'solid-js'
import {
  Hydration,
  HydrationScript,
  NoHydration,
  ssr,
  useAssets,
} from 'solid-js/web'
import { MetaProvider } from '@solidjs/meta'
import type { AnyRouter, RouterManagedTag, RouterState } from '@tanstack/router-core'

// Import the function dynamically since it might not be available in the module
function getTagsFromRouterState(state: RouterState): Array<RouterManagedTag> {
  // Try to use the exported function if it exists
  try {
    // Use the imported function directly since we're importing it at the top
    return getTagsFromState(state);
  } catch (e) {
    // Function not available, fallback to our implementation
    console.warn('Error using getTagsFromState, falling back to local implementation', e);
  }

  // Process our own tags extraction if the function doesn't exist
  const allTags: Array<RouterManagedTag> = [];
  
  // Extract stylesheets and other resources
  state.matches.forEach((match: any) => {
    // Add meta tags
    if (match.meta) {
      match.meta.forEach((meta: any) => {
        if (!meta) return;
        if (meta.title) {
          allTags.push({
            tag: 'title',
            children: meta.title,
          });
        } else {
          allTags.push({
            tag: 'meta',
            attrs: {...meta},
          });
        }
      });
    }
    
    // Add links
    if (match.links) {
      match.links.forEach((link: any) => {
        if (!link) return;
        allTags.push({
          tag: 'link',
          attrs: {...link},
        });
      });
    }
    
    // Add scripts
    if (match.headScripts) {
      match.headScripts.forEach((script: any) => {
        if (!script) return;
        allTags.push({
          tag: 'script',
          attrs: {...script},
          children: script.children,
        });
      });
    }
  });
  
  return allTags;
}

export function ServerHeadContent(props: { router?: AnyRouter, skipStylesheets?: boolean }) {
  // If router is provided directly, use it; otherwise try the hook
  // This makes it work both inside and outside of RouterProvider
  let tags: Array<RouterManagedTag> | Solid.Accessor<Array<RouterManagedTag>>;
  
  if (props.router) {
    // Call our function that will try to use getTagsFromState or fallback
    const stateTags = getTagsFromRouterState(props.router.state);
    
    // If skipStylesheets is true, we'll filter out stylesheet links since they're already loaded
    if (props.skipStylesheets) {
      // Remove all stylesheet links as they're handled by our critical CSS loader
      tags = stateTags.filter(tag => 
        !(tag.tag === 'link' && tag.attrs && tag.attrs.rel === 'stylesheet')
      );
    } else {
      // Prioritize CSS stylesheets as before
      const stylesheets: Array<RouterManagedTag> = [];
      const preloads: Array<RouterManagedTag> = [];
      const others: Array<RouterManagedTag> = [];
      
      stateTags.forEach((tag: RouterManagedTag) => {
        if (tag.tag === 'link' && tag.attrs && tag.attrs.rel === 'stylesheet') {
          // Add enhanced attributes for stylesheets
          stylesheets.push({
            ...tag,
            attrs: {
              ...tag.attrs,
              fetchpriority: 'high',
              importance: 'high',
            }
          });
          // Create a preload version
          preloads.push({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'style',
              href: tag.attrs.href,
              fetchpriority: 'high',
            }
          });
        } else {
          others.push(tag);
        }
      });
      
      // Reorder with stylesheets first
      tags = [...preloads, ...stylesheets, ...others];
    }
  } else {
    // Try to use the hook (will only work inside RouterProvider)
    try {
      const rawTags = useTags();
      
      // Filter out stylesheet links if needed
      if (props.skipStylesheets) {
        tags = Solid.createMemo(() => {
          return rawTags().filter(tag => 
            !(tag.tag === 'link' && tag.attrs && tag.attrs.rel === 'stylesheet')
          );
        });
      } else {
        tags = rawTags;
      }
    } catch (e) {
      console.warn('ServerHeadContent: Unable to use useTags, no router context available');
      tags = [];
    }
  }
  
  // Only add FOUC prevention if we're not skipping stylesheets
  const inlineStyle: RouterManagedTag | null = !props.skipStylesheets ? {
    tag: 'style',
    attrs: { id: 'fouc-prevention' },
    children: `
      /* Prevent FOUC */
      body:not(.css-loaded) { opacity: 0 !important; }
      body.css-loaded { opacity: 1 !important; transition: opacity 0.2s ease-in; }
    `
  } : null;
  
  // Only add CSS load detection if we're not skipping stylesheets
  const cssLoadScript: RouterManagedTag | null = !props.skipStylesheets ? {
    tag: 'script',
    attrs: { id: 'css-load-detector' },
    children: `
      (function() {
        function markCssLoaded() {
          if (document.body) document.body.classList.add('css-loaded');
        }
        if (document.readyState === 'complete') {
          markCssLoaded();
        } else {
          window.addEventListener('load', markCssLoaded);
        }
        setTimeout(markCssLoaded, 1000); // Fallback
      })();
    `
  } : null;
  
  // Add these special tags to the final output if they're not null
  const finalTags = Array.isArray(tags) 
    ? [
        ...(inlineStyle ? [inlineStyle] : []), 
        ...tags, 
        ...(cssLoadScript ? [cssLoadScript] : [])
      ]
    : Solid.createMemo(() => [
        ...(inlineStyle ? [inlineStyle] : []), 
        ...tags(), 
        ...(cssLoadScript ? [cssLoadScript] : [])
      ]);
  
  useAssets(() => {
    return (
      <MetaProvider>
        {Array.isArray(finalTags) 
          ? finalTags.map((tag) => <Asset {...tag} />)
          : finalTags().map((tag) => <Asset {...tag} />)
        }
      </MetaProvider>
    )
  })
  return null
}

const docType = ssr('<!DOCTYPE html>')

export function StartServer<TRouter extends AnyRouter>(props: {
  router: TRouter
}) {
  // Extract CSS URLs directly from router state for early loading
  const extractCssUrls = () => {
    const cssUrls: Set<string> = new Set();
    
    try {
      // Process each match in the router state to find stylesheets
      props.router.state.matches.forEach(match => {
        if (match.links) {
          match.links.forEach(link => {
            if (link && link.rel === 'stylesheet' && link.href) {
              cssUrls.add(link.href);
            }
          });
        }
      });
    } catch (e) {
      console.warn('Error extracting CSS URLs', e);
    }
    
    return Array.from(cssUrls);
  };
  
  // Get all CSS URLs that need to be preloaded
  const cssUrls = extractCssUrls();
  
  // Create critical inline script to load CSS before anything else
  const inlineCssLoaderScript = `
    <!-- Critical CSS loader -->
    <script>
      (function() {
        // CSS URLs detected during SSR
        var cssUrls = ${JSON.stringify(cssUrls)};
        
        // Function to load a stylesheet with high priority
        function loadStylesheet(url) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          link.setAttribute('fetchpriority', 'high');
          link.setAttribute('importance', 'high');
          document.head.insertBefore(link, document.head.firstChild);
          return link;
        }
        
        // Function to handle when all stylesheets are loaded
        function markCssLoaded() {
          document.documentElement.classList.add('css-loaded');
        }
        
        // Add the FOUC prevention style
        var style = document.createElement('style');
        style.textContent = 'html:not(.css-loaded){opacity:0!important}html.css-loaded{opacity:1!important;transition:opacity 0.2s ease-in}';
        document.head.insertBefore(style, document.head.firstChild);
        
        // Load all stylesheets immediately
        var loaded = 0;
        var total = cssUrls.length;
        
        if (total === 0) {
          // No stylesheets to load
          setTimeout(markCssLoaded, 0);
        } else {
          // Track when all stylesheets have loaded
          for (var i = 0; i < cssUrls.length; i++) {
            var link = loadStylesheet(cssUrls[i]);
            
            link.onload = link.onerror = function() {
              loaded++;
              if (loaded >= total) {
                markCssLoaded();
              }
            };
          }
          
          // Fallback timer to ensure content becomes visible
          setTimeout(markCssLoaded, 1000);
        }
      })();
    </script>
  `;
  
  return (
    <NoHydration>
      {docType as any}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          
          {/* Critical CSS loader - inlined at the very top */}
          <NoHydration>
            {ssr(inlineCssLoaderScript) as any}
          </NoHydration>
          
          {/* Then load other head content */}
          <ServerHeadContent router={props.router} skipStylesheets={true} />
          
          {/* Hydration script comes after CSS is loaded */}
          <HydrationScript />
        </head>
        <body>
          <Hydration>
            <RouterProvider
              router={props.router}
              InnerWrap={(props) => (
                <NoHydration>
                  <MetaProvider>
                    <Hydration>{props.children}</Hydration>
                    <Scripts />
                  </MetaProvider>
                </NoHydration>
              )}
            />
          </Hydration>
        </body>
      </html>
    </NoHydration>
  )
}
