/**
 * HtmlSafeRenderer - XSS Prevention & Safe DOM Manipulation
 * Resolves 16 security issues (XSS vulnerabilities in HTML files)
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const HtmlSafeRenderer = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    // Allowed HTML tags (whitelist approach)
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'strike', 'del',
      'a', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    
    // Allowed attributes - `style` attribute removed from global
    ALLOWED_ATTRIBUTES: {
      '*': ['class', 'id', 'title'],
      'a': ['href', 'target', 'rel'],
      'table': ['border', 'cellpadding', 'cellspacing'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan']
    },
    
    // URLs must start with these protocols
    ALLOWED_PROTOCOLS: ['http:', 'https:', 'mailto:', 'tel:'],
    
    // Log security events
    LOG_SECURITY_EVENTS: true
  };

  // ============================================================================
  // HTML ESCAPING
  // ============================================================================
  
  /**
   * Escape HTML entities to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    if (text == null) return '';
    
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  /**
   * Quick escape without DOM (for use in contexts without document)
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtmlFast(text) {
    if (text == null) return '';
    
    return String(text)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Escape HTML attributes
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeAttribute(text) {
    if (text == null) return '';
    
    return String(text)
      .replace(/&/g, '&')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '<')
      .replace(/>/g, '>');
  }

  // ============================================================================
  // URL VALIDATION
  // ============================================================================
  
  /**
   * Validate URL to prevent javascript: and data: protocols
   * @param {string} url - URL to validate
   * @returns {string|null} Safe URL or null if unsafe
   */
  function validateUrl(url) {
    if (!url) return null;
    
    try {
      // Check for javascript: protocol
      const lowerUrl = url.toLowerCase().trim();
      
      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
      for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
          console.warn(`HtmlSafeRenderer: Blocked dangerous URL protocol: ${protocol}`);
          return null;
        }
      }
      
      // Check for HTML entities that might decode to dangerous protocols
      if (lowerUrl.includes('javascript') || lowerUrl.includes('&#')) {
        // Decode HTML entities and check again
        const decoded = lowerUrl
          .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&#([0-9]+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/&colon;/g, ':')
          .replace(/&tab;/g, '\t')
          .replace(/&newline;/g, '\n');
        
        for (const protocol of dangerousProtocols) {
          if (decoded.includes(protocol)) {
            console.warn('HtmlSafeRenderer: Blocked obfuscated dangerous URL');
            return null;
          }
        }
      }
      
      // Allow relative URLs (starting with /)
      if (url.startsWith('/') || url.startsWith('#')) {
        return url;
      }
      
      // Validate absolute URLs
      const parsed = new URL(url, window.location.href);
      
      if (!CONFIG.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        console.warn(`HtmlSafeRenderer: Blocked URL with protocol: ${parsed.protocol}`);
        return null;
      }
      
      return url;
      
    } catch (e) {
      // Invalid URL format
      console.warn('HtmlSafeRenderer: Invalid URL format:', url);
      return null;
    }
  }

  // ============================================================================
  // HTML SANITIZATION
  // ============================================================================
  
  /**
   * Sanitize HTML content (whitelist approach)
   * @param {string} html - HTML to sanitize
   * @returns {string} Sanitized HTML
   */
  function sanitizeHtml(html) {
    try {
      if (!html) return '';
      
      // Create a temporary element
      const temp = document.createElement('div');
      temp.innerHTML = String(html);
      
      // Remove disallowed tags and attributes
      const elements = temp.getElementsByTagName('*');
      
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const tagName = element.tagName.toLowerCase();
        
        // Remove script and style tags entirely
        const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea'];
        if (dangerousTags.includes(tagName)) {
          if (CONFIG.LOG_SECURITY_EVENTS) {
            console.warn(`HtmlSafeRenderer: Removed dangerous tag: ${tagName}`);
          }
          element.remove();
          continue;
        }
        
        // Check if tag is allowed
        if (!CONFIG.ALLOWED_TAGS.includes(tagName)) {
          // Replace with text content
          const text = document.createTextNode(element.textContent);
          element.parentNode.replaceChild(text, element);
          continue;
        }
        
        // Check attributes
        const allowedAttrs = CONFIG.ALLOWED_ATTRIBUTES[tagName] || [];
        const globalAttrs = CONFIG.ALLOWED_ATTRIBUTES['*'] || [];
        const allAllowedAttrs = [...allowedAttrs, ...globalAttrs];
        
        for (let j = element.attributes.length - 1; j >= 0; j--) {
          const attr = element.attributes[j];
          const attrName = attr.name.toLowerCase();
          
          // Remove event handlers
          if (attrName.startsWith('on')) {
            if (CONFIG.LOG_SECURITY_EVENTS) {
              console.warn(`HtmlSafeRenderer: Removed event handler: ${attrName}`);
            }
            element.removeAttribute(attr.name);
            continue;
          }
          
          // Remove disallowed attributes
          if (!allAllowedAttrs.includes(attrName)) {
            element.removeAttribute(attr.name);
            continue;
          }
          
          // Validate URLs in href and src
          if (attrName === 'href' || attrName === 'src') {
            const safeUrl = validateUrl(attr.value);
            if (safeUrl === null) {
              element.removeAttribute(attr.name);
            } else if (safeUrl !== attr.value) {
              element.setAttribute(attr.name, safeUrl);
            }
          }
        }
        
        // Add rel="noopener noreferrer" to external links
        if (tagName === 'a') {
          const href = element.getAttribute('href');
          if (href && (href.startsWith('http:') || href.startsWith('https:'))) {
            const existingRel = element.getAttribute('rel') || '';
            if (!existingRel.includes('noopener')) {
              element.setAttribute('rel', 'noopener noreferrer ' + existingRel);
            }
          }
        }
      }
      
      return temp.innerHTML;
    } catch (e) {
      console.error('HtmlSafeRenderer: Sanitization failed', e.message);
      return escapeHtmlFast(html); // Fallback to full escape
    }
  }

  // ============================================================================
  // SAFE DOM MANIPULATION
  // ============================================================================
  
  /**
   * Safely set text content
   * @param {Element} element - DOM element
   * @param {string} text - Text content
   */
  function setText(element, text) {
    if (!element) return;
    element.textContent = String(text == null ? '' : text);
  }
  
  /**
   * Safely set HTML content (sanitized)
   * @param {Element} element - DOM element
   * @param {string} html - HTML content
   */
  function setHtml(element, html) {
    if (!element) return;
    element.innerHTML = sanitizeHtml(html);
  }
  
  /**
   * Safely create an element with attributes
   * @param {string} tag - Tag name
   * @param {Object} attributes - Attributes object
   * @param {string|Element} content - Content (text or element)
   * @returns {Element} Created element
   */
  function createElement(tag, attributes, content) {
    try {
      // Check if tag is allowed
      if (!CONFIG.ALLOWED_TAGS.includes(tag.toLowerCase())) {
        console.warn(`HtmlSafeRenderer: Cannot create disallowed element: ${tag}`);
        return document.createTextNode(String(content || ''));
      }
      
      const element = document.createElement(tag);
      
      // Set attributes
      if (attributes) {
        Object.keys(attributes).forEach(attrName => {
          const value = attributes[attrName];
          
          // Skip event handlers
          if (attrName.toLowerCase().startsWith('on')) {
            console.warn(`HtmlSafeRenderer: Skipped event handler attribute: ${attrName}`);
            return;
          }
          
          // Validate URLs
          if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
            const safeUrl = validateUrl(value);
            if (safeUrl !== null) {
              element.setAttribute(attrName, safeUrl);
            }
            return;
          }
          
          element.setAttribute(attrName, escapeAttribute(value));
        });
      }
      
      // Set content
      if (content) {
        if (typeof content === 'string') {
          element.textContent = content;
        } else if (content instanceof Element) {
          element.appendChild(content);
        }
      }
      
      return element;
    } catch (e) {
      console.error('HtmlSafeRenderer: createElement failed', e.message);
      return document.createTextNode(String(content || ''));
    }
  }
  
  /**
   * Safely append content to an element
   * @param {Element} parent - Parent element
   * @param {string|Element} content - Content to append
   */
  function appendContent(parent, content) {
    if (!parent) return;
    
    if (typeof content === 'string') {
      parent.appendChild(document.createTextNode(content));
    } else if (content instanceof Element) {
      parent.appendChild(content);
    }
  }
  
  /**
   * Clear element safely
   * @param {Element} element - Element to clear
   */
  function clearElement(element) {
    if (!element) return;
    
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  // ============================================================================
  // TEMPLATE RENDERING
  // ============================================================================
  
  /**
   * Render a template with escaped values
   * @param {string} template - Template string with ${placeholders}
   * @param {Object} data - Data object
   * @returns {string} Rendered HTML
   */
  function renderTemplate(template, data) {
    if (!template) return '';
    
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], data);
      return escapeHtml(value);
    });
  }
  
  /**
   * Create table rows from data (safe version)
   * @param {Array} data - Array of objects
   * @param {Array} columns - Column definitions [{key, title, formatter}]
   * @returns {DocumentFragment} Table rows fragment
   */
  function createTableRows(data, columns) {
    const fragment = document.createDocumentFragment();
    
    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      
      columns.forEach(col => {
        const td = document.createElement('td');
        
        // Get value
        let value = row[col.key];
        
        // Apply formatter if provided
        if (col.formatter && typeof col.formatter === 'function') {
          const formatted = col.formatter(value, row, index);
          if (typeof formatted === 'string') {
            td.textContent = formatted;
          } else if (formatted instanceof Element) {
            td.appendChild(formatted);
          }
        } else {
          td.textContent = value == null ? '' : String(value);
        }
        
        tr.appendChild(td);
      });
      
      fragment.appendChild(tr);
    });
    
    return fragment;
  }
  
  /**
   * Create a list from data (safe version)
   * @param {Array} items - Array of items
   * @param {Function} renderItem - Function to render each item
   * @param {boolean} ordered - Whether to create ordered list
   * @returns {Element} List element
   */
  function createList(items, renderItem, ordered = false) {
    const list = document.createElement(ordered ? 'ol' : 'ul');
    
    items.forEach((item, index) => {
      const li = document.createElement('li');
      const content = renderItem(item, index);
      
      if (typeof content === 'string') {
        li.textContent = content;
      } else if (content instanceof Element) {
        li.appendChild(content);
      }
      
      list.appendChild(li);
    });
    
    return list;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    // Configuration
    configure: function(options) {
      Object.assign(CONFIG, options);
    },
    
    // HTML Escaping
    escapeHtml: escapeHtml,
    escapeHtmlFast: escapeHtmlFast,
    escapeAttribute: escapeAttribute,
    
    // URL Validation
    validateUrl: validateUrl,
    
    // HTML Sanitization
    sanitizeHtml: sanitizeHtml,
    
    // Safe DOM Manipulation
    setText: setText,
    setHtml: setHtml,
    createElement: createElement,
    appendContent: appendContent,
    clearElement: clearElement,
    
    // Template Rendering
    renderTemplate: renderTemplate,
    createTableRows: createTableRows,
    createList: createList,
    
    /**
     * Safe version of innerHTML assignment
     * @param {Element} element - Target element
     * @param {string} html - HTML content (will be sanitized)
     */
    safeInnerHTML: function(element, html) {
      if (!element) {
        console.error('HtmlSafeRenderer: Cannot set innerHTML on null element');
        return;
      }
      element.innerHTML = sanitizeHtml(html);
    },
    
    /**
     * Safe version of document.write replacement
     * @param {Element} container - Container element
     * @param {string} html - HTML content
     */
    safeWrite: function(container, html) {
      if (!container) return;
      clearElement(container);
      container.innerHTML = sanitizeHtml(html);
    },
    
    /**
     * Render a safe table
     * @param {Element} container - Container element
     * @param {Array} data - Table data
     * @param {Array} columns - Column definitions
     */
    renderTable: function(container, data, columns) {
      if (!container) return;
      
      clearElement(container);
      
      const table = document.createElement('table');
      
      // Create header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.title || col.key;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create body
      const tbody = document.createElement('tbody');
      const rows = createTableRows(data, columns);
      tbody.appendChild(rows);
      table.appendChild(tbody);
      
      container.appendChild(table);
    },
    
    /**
     * Render a safe card/component
     * @param {Element} container - Container element
     * @param {Object} options - Card options
     */
    renderCard: function(container, options) {
      if (!container) return;
      
      const opts = Object.assign({
        title: '',
        content: '',
        className: '',
        safeHtml: false
      }, options);
      
      const card = document.createElement('div');
      card.className = 'card ' + (opts.className || '');
      
      if (opts.title) {
        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = opts.title;
        card.appendChild(title);
      }
      
      const content = document.createElement('div');
      content.className = 'card-content';
      
      if (opts.safeHtml) {
        content.innerHTML = sanitizeHtml(opts.content);
      } else {
        content.textContent = opts.content;
      }
      
      card.appendChild(content);
      container.appendChild(card);
    }
  };
  
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HtmlSafeRenderer;
}
