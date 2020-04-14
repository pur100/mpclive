function variableProductsInit(params) {
  if(variableProductsInited) { return } else { variableProductsInited = true }

  try {
    if(params.enable) {
      var productsPath = window.location.pathname.match(/.*\/products\/([\w\d-]+)/)
      if(productsPath) {
        removeLoadCss()
        productsPath[1]
        $.getJSON(productsPath[0] + '.js', function(response) {
          var variantMatch = window.location.search.match(/variant=(\d+)/), variantTitle = null;
          if(variantMatch) {
            variantTitle = response.variants.find(function(v) {
              return v.id == variantMatch[1]
            }).title
          }

          var data = {
            product: {
              product_id: response.id,
              variant_id: variantMatch ? variantMatch[1] : null,
              vendor: response.vendor,
              product_type: response.type,
              product_handle: response.handle,
              product_title: response.title,
              variant_title: variantMatch ? variantTitle : null
            }
          }
          $.ajax({
            method: 'GET', url: params.storeProductViewsUrl, data: data
          })
           // used_variables: (params)
        })
        return;
      }
    }

    var variablePage = document.querySelector('[data-behavior="variable-products"]')
    var productSelector = 'a[href*="/products/"]:not(form a[href*="/products/"]):not(.related-products a[href*="/products/"]):not([href*=".JP"]):not([href*=".png"]):not([href*=".PNG"])'
    if(params.enable) {
      const collectionPath = window.location.pathname.match(/.*\/collections\/([\w\d-]+)/)
      let collectionBlackList
      if(collectionPath || !params.onCollectionPages) {
        collectionBlackList = collectionPath ? params.blackListsForCollections[collectionPath[1]] : undefined

        $.each($('[data-behavior="variable-products"]').parent().children(), function(i, el) {
          if(el.dataset.behavior !== "variable-products" && $(el).find(productSelector).length && !el.classList.contains('variable-products')) {
            el.remove()
          }
        });

        // check collection blacklist
        if(collectionBlackList) {
          $.each($('[data-behavior="variable-products"]').children(), function(e, el) {
            const title = el.querySelector('[data-behavior="variable-product_title"]')
            if(title && collectionBlackList.includes(title.dataset.variant_id)) {
              el.remove()
            }
          })
        }

        $.each($('[data-behavior="variable-products"]').contents(), function(i, el) {
          $(el).addClass('variable-products');
        });
        initLazyLoading()
        document.querySelectorAll('[data-behavior="variable-products"]').forEach(function(el) {
          $(el).replaceWith($(el).contents());
        })

        setTitles()
      } else {
        document.querySelectorAll('[data-behavior="variable-products"]').forEach(e => {
          e.remove()
        })
      }
    } else {
      document.querySelectorAll('[data-behavior="variable-products"]').forEach(e => {
        e.remove()
      })
    }
  }
  catch(error) {
    document.querySelectorAll('[data-behavior="variable-products"]').remove()
  }
  finally {
    removeLoadCss()
    const loader = document.querySelector('.variable-loader')
    if(loader) {
      loader.style.display = 'none';
    }
  }

  if(variablePage) {
    var productListEl = document.querySelector('[data-behavior="variable_product_list"]'), productsData = undefined
    if(productListEl) {
      try {
        productsData = JSON.parse(productListEl.dataset.product_list)
         // used_variables: (productsData)
      }
      catch(error) {
        console.log(error)
      }
    }

    var linkSelector = '[data-behavior="variable-product_title"]'
    findProducts()
  }

  function findProducts() {
    var productsCount = $(linkSelector).length
    var fetchedProducts = {}

    if(productsData) {
      productsCount = 0
      productsData.forEach(function(e){
        productsCount += e[Object.keys(e)[0]].variants.length
      })
      productListEl.remove()

      foundProducts = []
      $.each($(linkSelector), function(i, el) {
        var product = $(el).parents('.variable-products')[0]
        if(product && !foundProducts.includes(product)) {
          foundProducts.push(product)
        }
      })
      if(foundProducts.length == productsCount && params.add_to_cart_enabled && !isMobile()) {
        initAddToCart($(linkSelector))
      }
      if(productsCount > 1) {
        detectWrapSelector()
      }
    }

    function initAddToCart(collection) {
      $.each(collection, function(i, el) {
        try {
          var wrap
          if(collection.length > 1) {
            wrap = elSibler(el, linkSelector, productsCount, el)
          } else if(collection.length == 1 && document.querySelector(params.wrapSelector)) {
            wrap = document.querySelector(params.wrapSelector).children[0].children[0]
          }
          if(wrap) {
            // image and title in different nodes. Only because wrap is prevEl
            // if(wrap.parentElement.querySelectorAll('a[href*="/products/"]').length != wrap.querySelectorAll('a[href*="/products/"]').length) {
            //   var parent = wrap.parentElement
            //   parent.innerHTML = '<div data-behavior="variable-parent">' + parent.innerHTML + '</div>'
            //   wrap = parent.querySelector('[data-behavior="variable-parent"]')
            // }

            var link
            wrap.querySelectorAll('a[href*="/products/"]').forEach(function(a) {
              if(a.href.match(/.*\/products\/([\S-]+)/)) {
                link = a
              }
            })
            if(!link && wrap.tagName == 'A') {
              link = wrap
            }
            var match = link.href.match(/.*\/products\/([\S-]+)/)
            productSlug = match[1]
            var extraMatch = productSlug.match(/([\S-]+)\?/)
            productSlug = extraMatch ? extraMatch[1] : productSlug
            product = productsData.find(function(p) {
              return p[productSlug] || p[decodeURIComponent(productSlug)]
            })
            if(product) {
              product = product[productSlug] || product[decodeURIComponent(productSlug)]
              variantMatch = link.href.match(/variant=(\d+)/)
              variantId = variantMatch ? variantMatch[1] : product.variants[0].id
              var variant = product.variants.find(function(v) {
                return v.id == variantId
              })

              selects = ''
              if(params.optionsViewType !== 'show_all') {
                Object.keys(product.options).forEach(function(key) {
                  var option = product.options[key]
                  if(!variant.ctitle[key] && option.name !== 'Title') {
                    var htmlName = variant.id + 'variable-option_' + option.name;

                    var optionsHtml = ''
                    option.values.forEach(function(value){
                      var selected = variant[key] == value ? 'selected' : '';
                      optionsHtml += '<option value="' + value + '"' + selected + '>' + value + '</option>'
                    })

                    selects += `<div class="variable-add_to_cart-option">
                                  <label for="` + htmlName + '">' + option.name + `</label>
                                  <select name="` + htmlName + `" data-behavior="variable-products_options-selector"
                                                                  data-option_key="` + key + '">' +
                                    optionsHtml +
                                  `</select>
                                </div>`

                  }
                });
              }

              $(wrap).addClass('variable-add_to_cart-product')
              if(!wrap.querySelector('.variable-add_to_cart-wrapper')) {
                wrap.appendChild(addToCartBtn(productSlug, variantId, selects, variant.ctitle, variant.available));
              }
              // var colorsArr = parsedColor(getComputedStyle(document.querySelector('body')).backgroundColor)
              // var backgroundColor = 'rgb(' + colorsArr.slice(1,4).join(', ') + ')'
              // wrap.style.backgroundColor = backgroundColor;
            }
          }
        }
        catch(error) {}
      });

      $(document).on('click', '[data-behavior="variable-products_add_to_cart"]:not(.btn--secondary)', function(e) {
        el = e.currentTarget
        $.ajax({
          url: '/cart/add.js',
          method: 'post',
          data: {
            quantity: el.parentElement.parentElement.querySelector('[data-behavior="variable-products_quantity"] input').value,
            id: el.dataset.variant_id
          }
        }).always(function(response) {
          if(response.status == 200) {
            $(el).addClass('btn--secondary').text(params.addToCartLabels.goToCheckout);
            $('[data-behavior="variable-products_cart_error"]').text('');
            
          }
          else {
            $(el).parents('.variable-add_to_cart-footer').find('[data-behavior="variable-products_cart_error"]').text(JSON.parse(response.responseText).description);
          }
        })
      });

      // hacks
      var hacks = { children: {} }
      $(document).on('mouseenter', '.variable-add_to_cart-product', function(e) {
        var debutLink = e.currentTarget.querySelector('.grid-view-item__link:not(.full-width-link)')
        if(debutLink) {
          hacks.debutLinkPosition = debutLink.style.position
          debutLink.style.position = 'relative'
        }

        var debutFullWidthLink = e.currentTarget.querySelector('a.full-width-link')
        if(debutFullWidthLink) {
          hacks.debutLinkZIndex = debutFullWidthLink.style.zIndex
          debutFullWidthLink.style.zIndex = 21
        }

        var visiableWrap = wrapSelector()
        if(visiableWrap) {
          hacks.debutOverflowWrap = visiableWrap.style.position
          visiableWrap.style.overflow = 'visible'
        }

        $.each($(e.currentTarget.children), function(index, child) {
          if(!$(child).hasClass('variable-add_to_cart-wrapper') &&
             !($(child).find('.placeholder-svg').length && $(child).find('.badge').length) &&
             !($(child).hasClass('product__prices') && $(child).find('.badge').length) &&
             !$(child).hasClass('full-width-link')) {
            hacks['child' + index] = child.style.position
            child.style.position = 'relative'
          }
          if($(child).hasClass('product__prices') && $(child).find('.badge').length) {
            $.each($(child.children), function(index, innerChild) {
              if(!($(innerChild).hasClass('badge') || $(innerChild).find('.badge').length)) {
                hacks.children[innerChild] = innerChild.style.position
                innerChild.style.position = 'relative'
              }
            })
          }
        })

        var jumpstartSvgPosition = e.currentTarget.querySelector('.placeholder-svg')
        if(jumpstartSvgPosition) {
          hacks.debutLinkPosition = jumpstartSvgPosition.style.position
          jumpstartSvgPosition.style.position = 'relative'
        }

        var ventureBtn = e.currentTarget.querySelector('[data-behavior="variable-products_add_to_cart"]')
        if(ventureBtn) {
          hacks.debutLinkPosition = ventureBtn.style.position
          ventureBtn.style.position = 'relative'
          if(ventureBtn.offsetWidth > (0.6 * e.currentTarget.querySelector('.variable-add_to_cart-options_wrapper').offsetWidth)) {
            e.currentTarget.querySelector('.variable-add_to_cart-quantity').style.width = '60%'
          }
        }

        var ventureNav = document.body.querySelector('#StickyBar') || document.body.querySelector('.action-area')
        if(ventureNav) {
          hacks.ventureNavZIndex = ventureNav.style.zIndex
          ventureNav.style.zIndex = 21
        }

        var narrative1CriticalParent = $(e.currentTarget.parentElement).hasClass('critical-clear')
        if(narrative1CriticalParent) {
          hacks.narrative1CriticalParentPosition = e.currentTarget.parentElement.style.position
          hacks.narrative1CriticalParentZIndex = e.currentTarget.parentElement.style.zIndex
          e.currentTarget.parentElement.style.position = 'relative'
          e.currentTarget.parentElement.style.zIndex = 3
        }

        if(getComputedStyle(e.currentTarget.parentElement).zIndex == 'auto') {
          hacks.parentZIndex = 'auto'
          e.currentTarget.parentElement.style.zIndex = 3
        }

        var simpleMainParent = $(e.currentTarget.parentElement).parents('main')[0]
        if(simpleMainParent && getComputedStyle(simpleMainParent).overflow == 'hidden') {
          hacks.simpleMainParentOverflow = simpleMainParent.style.overflow
          simpleMainParent.style.overflow = 'visible'
        }

        e.currentTarget.querySelectorAll('a[href*="/products/"]').forEach(function(a) {
          var titleEl = e.currentTarget.querySelector('[data-behavior="variable-product_title"]')
          if(titleEl && a.title) {
            a.title = titleEl.textContent.trim()
          }
        })

        if(typeof Shopify !== 'undefined' && Shopify.theme) {
          if(Shopify.theme.name && Shopify.theme.name.includes('Pop')) {
            var popCartWrap = e.currentTarget.querySelector('.variable-add_to_cart-wrapper')
            if(popCartWrap) {
              hacks.popWrapbackgroundColor = popCartWrap.style.backgroundColor
              popCartWrap.style.backgroundColor = 'transparent'
            }
          }
        }
      }).on('mouseleave', '.variable-add_to_cart-product', function(e) {
        var debutLink = e.currentTarget.querySelector('.grid-view-item__link:not(.full-width-link)')
        if(debutLink) {
          debutLink.style.position = hacks.debutLinkPosition
        }

        var debutFullWidthLink = e.currentTarget.querySelector('a.full-width-link')
        if(debutFullWidthLink) {
          debutFullWidthLink.style.zIndex = hacks.debutLinkZIndex
        }

        var visiableWrap = wrapSelector()
        if(visiableWrap) {
          visiableWrap.style.overflow = hacks.debutOverflowWrap
        }

        $.each($(e.currentTarget.children), function(index, child) {
          if(!$(child).hasClass('variable-add_to_cart-wrapper') &&
             !$(child).find('.placeholder-svg').length &&
             !($(child).hasClass('product__prices') && $(child).find('.badge').length) &&
             !$(child).hasClass('full-width-link')) {
            child.style.position = hacks['child' + index]
          }
          if($(child).hasClass('product__prices') && $(child).find('.badge').length) {
            $.each($(child.children), function(index, innerChild) {
              if(!($(innerChild).hasClass('badge') || $(innerChild).find('.badge').length)) {
                innerChild.style.position = hacks.children[innerChild]
              }
            })
          }
        })

        var jumpstartSvgPosition = e.currentTarget.querySelector('.placeholder-svg')
        if(jumpstartSvgPosition) {
          visiableWrap.style.position = hacks.jumpstartSvgPosition
        }

        var ventureNav = document.body.querySelector('#StickyBar') || document.body.querySelector('.action-area')
        if(ventureNav) {
          ventureNav.style.zIndex = hacks.ventureNavZIndex
        }

        var narrative1CriticalParent = $(e.currentTarget.parentElement).hasClass('critical-clear')
        if(narrative1CriticalParent) {
          e.currentTarget.parentElement.style.position = hacks.narrative1CriticalParentPosition
          e.currentTarget.parentElement.style.zIndex = hacks.narrative1CriticalParentZIndex
        }

        if(hacks.parentZIndex) {
          e.currentTarget.parentElement.style.zIndex = 'auto'
          hacks.parentZIndex = undefined
        }

        var simpleMainParent = $(e.currentTarget.parentElement).parents('main')[0]
        if(simpleMainParent && hacks.simpleMainParentOverflow != undefined) {
          simpleMainParent.style.overflow = hacks.simpleMainParentOverflow
        }

        if(typeof Shopify !== 'undefined' && Shopify.theme) {
          if(Shopify.theme.name && Shopify.theme.name.includes('Pop')) {
            var popCartWrap = e.currentTarget.querySelector('.variable-add_to_cart-wrapper')
            if(popCartWrap) {
              pop6CartWrap.style.backgroundColor = hacks.pop6WrapbackgroundColor
            }
          }
        }
      });

      var wrap = wrapSelector()
      if(wrap) {
        if(getComputedStyle(wrap).marginBottom[0] == '-') {
          wrap.style.marginBottom = "0px"
        }
      }

      ///////////////////////

      $(document).on('click', '[data-behavior="variable-products_add_to_cart"].btn--secondary', function(e) {
        window.location.pathname = '/cart';
      });

      if(params.optionsViewType !== 'show_all') {
        $(document).on('mouseenter', '.variable-add_to_cart-product', function(e) {
          var slug = $(e.currentTarget).find('[data-behavior="variable-products_options_wrapper"]').data('product_slug')
          if(!fetchedProducts[slug]) {
            timer = setTimeout(function () {
              fetchProducts(slug)
            }, 300);
            fetchedProducts[slug] = { timer: timer }
          }
        }).on('mouseleave', '.variable-add_to_cart-product', function(e) {
          var slug = $(e.currentTarget).find('[data-behavior="variable-products_options_wrapper"]').data('product_slug')
          if(fetchedProducts[slug] && fetchedProducts[slug].timer) {
            clearTimeout(fetchedProducts[slug].timer);
            fetchedProducts[slug] = undefined
          }
        });

        $(document).on('change', 'select[data-behavior="variable-products_options-selector"]', function(e) {
          var selectWrap = $(e.currentTarget).parents('[data-behavior="variable-products_options_wrapper"]')
          var selectedData = {}
          selectedData[e.currentTarget.dataset.option_key] = e.currentTarget.value
          assignVariant(selectWrap, selectedData)
          updateSelectContent(selectWrap[0])
        });
      }

      function fetchProducts(slug) {
        $.getJSON('/products/' + slug + '.js', function(response) {
          var lateAssign = fetchedProducts[slug] && fetchedProducts[slug].assignVariant
          fetchedProducts[slug] = response

          document.querySelectorAll('[data-product_slug="' + slug + '"]').forEach(function(wrap) {
            updateSelectContent(wrap)
          })

          if(lateAssign) {
            assignVariant(lateAssign.selectWrap, lateAssign.selectedData)
          }
        })
      }

      function assignVariant(selectWrap, selectedData) { // { option2: 'red' }
        var link = selectWrap.parent().find('[data-behavior="variable-products_add_to_cart"]')[0]
        var slug = selectWrap.data('product_slug')
        if(!fetchedProducts[slug]) {
          fetchProducts(slug)
        } else {
          var ctitle = selectWrap.data('ctitle')
          var baseOtions = Object.assign(ctitle, selectedData)
          var variants = fetchedProducts[slug].variants
          if(variants) {
            var variant = fetchedProducts[slug].variants.find(function(variant) {
              var keysForEq = Object.keys(baseOtions).length
              Object.keys(baseOtions).forEach(function(key) {
                if(variant[key] == baseOtions[key]) {
                  keysForEq -= 1
                }
              })
              if(!keysForEq) {
                return variant
              }
            })
            if(variant) {
              link.dataset.variant_id = variant.id
              selectWrap[0].dataset.variant_id = variant.id
              if(variant.available) {
                $(link).removeClass('btn--secondary').removeClass('disabled').attr('disabled', false).text(params.addToCartLabels.addToCart)
              } else {
                $(link).removeClass('btn--secondary').addClass('disabled').attr('disabled', true).text(params.addToCartLabels.soldOut)
              }
              // Used selectWrap, variant
              
            }
          } else {
            fetchedProducts[slug].assignVariant = { selectWrap: selectWrap, selectedData: selectedData }
          }
        }
      }

      function updateSelectContent(selectWrap) {
        var slug = selectWrap.dataset.product_slug
        if(!fetchedProducts[slug] || !fetchedProducts[slug].variants) {
          return
        }
        for(var i = 1; i <= 3; i++) {
          var optionKey = 'option' + i
          var select = selectWrap.querySelector('[data-option_key="' + optionKey + '"]')
          if(select) {
            var optionsHtml = ''
            var variant = fetchedProducts[slug].variants.find(function(variant) {
              return variant.id == selectWrap.dataset.variant_id
            })
            fetchedProducts[slug].variants.filter(function(v) {
              return (optionKey == 'option1' || variant.option1 == v.option1) &&
                (optionKey == 'option2' || variant.option2 == v.option2) &&
                (optionKey == 'option3' || variant.option3 == v.option3)
            }).forEach(function(v){
              var selected = variant == v ? 'selected' : '';
              optionsHtml += '<option value="' + v[optionKey] + '"' + selected + '>' + v[optionKey] + '</option>'
            })
            select.innerHTML = optionsHtml
          }
        }

        $('[data-behavior="variable-products_cart_error"]').text('');
      }

      function addToCartBtn(productSlug, variantId, selects, ctitle, available) {
        var toCart = document.createElement("div");
        toCart.className = "variable-add_to_cart-wrapper";
        toCart.innerHTML = `<span class="variable-add_to_cart-footer">
                              <div class="variable-add_to_cart-options_wrapper" data-behavior="variable-products_options_wrapper"
                                   data-product_slug="` + productSlug + `"
                                   data-ctitle=` + JSON.stringify(ctitle) + `
                                   data-variant_id="` + variantId + `">
                                ` + selects + `
                              </div>
                              <div class="variable-add_to_cart-options_wrapper">
                                <div class="variable-add_to_cart-quantity" data-behavior="variable-products_quantity">
                                  <label for="variableQuantity_${variantId}">${params.addToCartLabels.quantity}</label>
                                  <input type="number" value="1" id="variableQuantity_${variantId}" name="variableQuantity_${variantId}" min="1" />
                                </div>
                                <div class="variable-add_to_cart-btn">
                                  <a href="javascript:void(0)" class="btn btn--fill btn--regular btn--color ${params.styles.add_to_cart_class || ''}"
                                     data-behavior="variable-products_add_to_cart" data-variant_id="` + variantId + `"
                                     ` + (available ? '' : 'disabled') + `>
                                    ` + (available ? params.addToCartLabels.addToCart : params.addToCartLabels.soldOut) + `
                                  </a>
                                </div>
                              </div>
                              <p class="error" data-behavior="variable-products_cart_error"></p>
                            </span>`;
        return toCart
      }
    }

    function wrapSelector() {
      var el = document.querySelector(linkSelector)
      if(el) {
        return elWrap(el, linkSelector, productsCount)
      }
    }

    function detectWrapSelector() {
      var wrap = wrapSelector()
      if(wrap) {
        var gridClass = wrap.className.match(/\S*grid\S*/)
        if(gridClass && "." + gridClass[0] != params.wrapSelector) {
          $.ajax({
            method: 'GET', url: params.wrapSelectorsUrl,
            data: {
              selector: gridClass[0]
            }
          })
        }
      }
    }
  }

  function setTitles() {
    var data = params.variants_titles
    for (var variantId in data) {
      var textEls = document.querySelectorAll('[data-behavior="variable-product_title"][data-variant_id="' + variantId + '"]')
      textEls.forEach(function(textEl) {
        if(textEl && data[variantId].length > 1) {
          textEl.textContent = data[variantId]
        }
      })
    }
  }

  function initLazyLoading() {
    const variantEl = document.querySelector('.variable-products')
    if(variantEl) {
      const currentDisplay = variantEl.style.display
      const FIRST_LIMIT = 35, LOADING_LIMIT = 25, variantsCount = document.querySelectorAll('.variable-products').length

      document.querySelectorAll('.variable-products').forEach((el, index) => {
        if(index >= FIRST_LIMIT) {
          el.style.display = 'none'
        }
      })

      if(variantsCount > FIRST_LIMIT) {
        let loading = false, displayedCount = FIRST_LIMIT;
        $(window).scroll(function(){
          if(!loading && $(window).scrollTop() + 600 > $(document).height() - $(window).height()){
            loading = true
            if(displayedCount < variantsCount) {
              displayedCount += LOADING_LIMIT
              document.querySelectorAll('.variable-products').forEach((el, index) => {
                if(index < displayedCount) {
                  el.style.display = currentDisplay
                }
              })
              loading = false
            }
          }
        });
      }
    }
  }

  function removeLoadCss() {
    const cssEl = document.querySelector("#variable-products-load-css")
    if(cssEl) {
      cssEl.remove()
    }
  }

  function addVariantElement() {
    var addVariantBlock = document.createElement("div");
    addVariantBlock.className = "variable-products-button";
    addVariantBlock.innerHTML = '<a class="btn btn--fill btn--regular btn--color" href="#">' + params.btnLabel + '</a>';
    addVariantBlock.addEventListener('click', addVariantBlockHandler);
    return addVariantBlock
  }

  // helpers
  function elSibler(el, resourceSelector, count, elPrev) {
    var wrap = way1(el, resourceSelector, count, elPrev)
    if(!wrap) {
      wrap = way2(el, resourceSelector, true)
    }
    return wrap

    function way1(el, resourceSelector, count, elPrev) {
      if(el == document.body) {
        return undefined
      }

      if($(el).siblings().length + 1 == count) {
        var has_resource = false
        $.each($(el).siblings(), function(i, sibl) {
          if($(sibl).find(resourceSelector).length) {
            has_resource = true
          } else {
            has_resource = false
            return false
          }
        })
        if(has_resource) {
          return elPrev || el
        }
      }
      var prev = elPrev ? el : undefined
      return way1(el.parentElement, resourceSelector, count, prev)
    }

    function way2(el, resourceSelector, prev) {
      if(el == document.body) {
        return undefined
      }

      if(el.parentElement.querySelectorAll(resourceSelector).length > 1) {
        return prev ? el : el.parentElement
      } else {
        return way2(el.parentElement, resourceSelector, prev)
      }
    }
  }

  function elWrap(el, resourceSelector, count) {
    var sibler = elSibler(el, resourceSelector, count)
    if(sibler) {
      return sibler.parentElement
    }
  }

  function priceInFormat(price) {
    var format = $('[data-behavior="variable-products_money_wrapper"]').data().money_format;
    return format.replace(/{{.*}}/gm, price / 100)
  }

  function imageUrl(src, size) {
    if(!src) {
      return noImage
    }
    try {
      if ("original" == size) return src;
      var t = src.match(/(.*\/[\w\-\_\.]+)\.(\w{2,4})/);
      return t[1] + "_" + size + "." + t[2]
    } catch (e) {
      return src
    }
  }

  function parsedColor(rgb) {
    var rgbRegex = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    return rgb.match(rgbRegex)
  }

  function isMobile() {
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
      || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
        return true;
    }
  }
}

var variableParams = {
  enable: true,
  checkoutRedirect: "",
  btnLabel: "",
  onCollectionPages: false, // Show only on collections
  storeProductViewsUrl: "https://variable.zubrcommerce.com/product_views/store.json",
  optionsViewType: "except_choosen",
  variants_titles: {"31842823667789":"Drap Plat Luxe Satin de Coton Sublime Beige Dune"},
  wrapSelector: ".grid",
  wrapSelectorsUrl: "https://variable.zubrcommerce.com/selectors/wrap.json",
  blackListsForCollections: {},
  add_to_cart_enabled: false,
  displayOutOfStock: true,
  outOfStockLimit: 0,
  addToCartLabels: {
    addToCart: "Add to cart",
    goToCheckout: "Go to checkout",
    soldOut: "Sold out",
    quantity: "Quantity"
  },
  styles: {}
}, variableProductsInited = false

if(!document.head.innerText.match(/variable-loader.js/) && !document.head.innerText.match(/variable.js/)) {
  variableParams.enable = false
}

document.addEventListener('DOMContentLoaded', function() {
  variableProductsInit(variableParams);
});

