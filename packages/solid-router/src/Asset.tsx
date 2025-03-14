import { Link, Meta, Style, Title } from '@solidjs/meta'
import type { RouterManagedTag } from '@tanstack/router-core'

// Declare global type for our loaded stylesheets registry
declare global {
  interface Window {
    __LOADED_STYLESHEETS__?: Set<string>;
  }
}

export function Asset({ tag, attrs, children }: RouterManagedTag): any {
  switch (tag) {
    case 'title':
      return <Title {...attrs}>{children}</Title>
    case 'meta':
      return <Meta {...attrs} />
    case 'link':
      if (
        typeof window !== 'undefined' && 
        attrs?.rel === 'stylesheet' && 
        attrs?.href && 
        typeof attrs.href === 'string'
      ) {
        const href = attrs.href;
        
        // Check if already loaded by the critical CSS loader
        // using both DOM check and global registry
        const isAlreadyLoaded = () => {
          // Check global registry first (fastest)
          if (window.__LOADED_STYLESHEETS__?.has(href)) {
            return true;
          }
          
          // Fallback to DOM check
          const links = document.querySelectorAll('link[rel="stylesheet"]');
          for (let i = 0; i < links.length; i++) {
            const link = links[i] as HTMLLinkElement;
            if (link.getAttribute('href') === href) {
              // Also add to registry for future checks
              window.__LOADED_STYLESHEETS__?.add(href);
              return true;
            }
          }
          return false;
        };
        
        if (isAlreadyLoaded()) {
          return null;
        }
      }
      return <Link {...attrs} />
    case 'style':
      return <Style {...attrs} innerHTML={children} />
    case 'script':
      if ((attrs as any) && (attrs as any).src) {
        return <script {...attrs} />
      }
      if (typeof children === 'string')
        return <script {...attrs} innerHTML={children} />
      return null
    default:
      return null
  }
}
