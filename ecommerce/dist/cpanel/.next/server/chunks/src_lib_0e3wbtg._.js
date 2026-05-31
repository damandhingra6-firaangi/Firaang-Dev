module.exports=[32791,e=>{"use strict";e.s(["fallbackProducts",0,[{id:"fallback-1",name:"Bohemian Maxi Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Bohemian Dresses",subCategorySlug:"bohemian-dresses",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat1.jpg",description:"A flowing silhouette with artisan embroidery and lightweight comfort for festive evenings."},{id:"fallback-2",name:"Celestial Drop Pendant",category:"Jewelry",categorySlug:"jewelry",subCategory:"Pendant",subCategorySlug:"pendant",price:"₹4,999",priceAmount:4999,currencyCode:"INR",oldPrice:"₹6,999",img:"/cat2.jpg",description:"Elegant handcrafted pendant with celestial detailing, designed to elevate everyday looks."},{id:"fallback-3",name:"Palazzo Fusion Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Palazzo Set",subCategorySlug:"palazzo-set",price:"₹6,999",priceAmount:6999,currencyCode:"INR",oldPrice:"₹9,999",img:"/hero.jpg",description:"Contemporary fusion set with soft drape and versatile styling for day-to-night wear."},{id:"fallback-4",name:"Gemstone",category:"Jewelry",categorySlug:"jewelry",subCategory:"Gemstone Jewelry",subCategorySlug:"gemstone-jewelry",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat4.jpg",description:"Statement accessory inspired by traditional textures and modern luxury aesthetics."},{id:"fallback-5",name:"Luxe Evening Gown",category:"Dresses",categorySlug:"dresses",subCategory:"Evening Gown",subCategorySlug:"evening-gown",price:"₹15,999",priceAmount:15999,currencyCode:"INR",oldPrice:"",img:"/cat3.jpg",description:"A dramatic evening profile with rich fabric movement and flattering structured tailoring."},{id:"fallback-6",name:"Royal Kundan Collar",category:"Jewelry",categorySlug:"jewelry",subCategory:"Kundan Jewelry",subCategorySlug:"kundan-jewelry",price:"₹10,999",priceAmount:10999,currencyCode:"INR",oldPrice:"₹14,999",img:"/cat2.jpg",description:"Ornate kundan work with a regal finish, crafted to anchor your festive wardrobe."},{id:"fallback-7",name:"Midnight Kurta Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Kurta Set",subCategorySlug:"kurta-set",price:"₹8,499",priceAmount:8499,currencyCode:"INR",oldPrice:"₹11,999",img:"/cat3.jpg",description:"Refined kurta set in deep tones with clean lines and subtle festive detailing."},{id:"fallback-8",name:"Scarlet Draped Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Draped Dress",subCategorySlug:"draped-dress",price:"₹13,999",priceAmount:13999,currencyCode:"INR",oldPrice:"₹17,999",img:"/hero.jpg",description:"Bold draped silhouette in a rich scarlet shade, made for standout celebratory moments."}]])},47259,e=>{"use strict";function t(e,t){for(let t of e){let e=process.env[t];if(!e)continue;let r=Number.parseFloat(e);if(Number.isFinite(r)&&r>0)return r}return t}let r={INR:1,USD:t(["NEXT_PUBLIC_FX_USD_TO_INR","FX_USD_TO_INR"],83),AED:t(["NEXT_PUBLIC_FX_AED_TO_INR","FX_AED_TO_INR"],22.6)},a={INR:"en-IN",USD:"en-US",AED:"en-AE"};e.s(["convertAmount",0,function(e,t,a){return Number.isFinite(e)?t===a?e:e*r[t]/r[a]:0},"formatCurrency",0,function(e,t){return new Intl.NumberFormat(a[t],{style:"currency",currency:t,maximumFractionDigits:2*("INR"!==t)}).format(e)},"toSupportedCurrency",0,function(e){let t=(e??"").toUpperCase();return"USD"===t||"AED"===t?t:"INR"}])},65648,e=>{"use strict";let t=["Devotional","Mandala Magic","Animal","Games & Sports","Anime Art","Dark Art","Abstract Art","Motivation","Yoga & Wellness","Gothic","Gen Z T-Shirts","Oversized T-Shirts","Graphic T-Shirts","Minimal T-Shirts"],r=new Map(t.map((e,t)=>[e.toLowerCase(),t])),a=[{category:"Half-Shirts",subCategoryFallback:"All Half-Shirts",match:[/\bhalf[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*half[-_\s]?shirts?\b/i]},{category:"T-Shirts",subCategoryFallback:"Classic T-Shirts",match:[/\bt[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*t[-_\s]?shirts?\b/i]},{category:"Hoodies",subCategoryFallback:"All Hoodies",match:[/\bhoodies?\b/i,/\bcategory\s*[:=]\s*hoodies?\b/i]},{category:"Sweatshirts",subCategoryFallback:"All Sweatshirts",match:[/\bsweat[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*sweat[-_\s]?shirts?\b/i]},{category:"Caps",subCategoryFallback:"All Caps",match:[/\bcaps?\b/i,/\bcategory\s*[:=]\s*caps?\b/i]}],i=[{category:"Half-Shirts",subCategoryFallback:"All Half-Shirts",match:[/half[-\s]?shirt/i,/short[-\s]?sleeve[-\s]?shirt/i,/half[-\s]?sleeve/i]},{category:"Hoodies",subCategoryFallback:"All Hoodies",match:[/hoodie/i]},{category:"Sweatshirts",subCategoryFallback:"All Sweatshirts",match:[/sweat[-\s]?shirt/i]},{category:"T-Shirts",subCategoryFallback:"Classic T-Shirts",match:[/t[-\s]?shirt/i,/tee/i]},{category:"Caps",subCategoryFallback:"All Caps",match:[/\bcap\b/i,/snapback/i,/baseball\s*cap/i,/trucker\s*cap/i]},{category:"Dresses",subCategoryFallback:"Everyday Dresses",match:[/dress/i,/gown/i]},{category:"Ethnic Wear",subCategoryFallback:"Ethnic Sets",match:[/kurta/i,/palazzo/i,/anarkali/i,/lehenga/i]},{category:"Jewelry",subCategoryFallback:"Accessories",match:[/jewel/i,/pendant/i,/kundan/i,/necklace/i,/gem/i]}],s={"T-Shirts":[{name:"Mandala Magic",match:[/mandala/i,/mandala\s*magic/i,/mandalamagic/i]},{name:"Devotional",match:[/\bshiv\b/i,/\bshiva\b/i,/\bmahadev\b/i,/\bhanuman\b/i,/\bkrishna\b/i,/\bram\b/i,/\bom\b/i,/\bdevotional\b/i,/\bspiritual\b/i,/\bbhakti\b/i,/\bganesh\b/i]},{name:"Animal",match:[/animal/i,/cat/i,/dog/i,/tiger/i,/lion/i,/wolf/i,/eagle/i,/panther/i,/bear/i]},{name:"Games & Sports",match:[/game/i,/gaming/i,/esports/i,/football/i,/cricket/i,/tennis/i,/basketball/i,/sport/i]},{name:"Anime Art",match:[/anime/i,/manga/i,/otaku/i]},{name:"Dark Art",match:[/dark/i,/occult/i,/noir/i,/grim/i]},{name:"Abstract Art",match:[/abstract/i,/geometry/i,/pattern/i]},{name:"Motivation",match:[/motivat/i,/hustle/i,/mindset/i,/discipline/i,/focus/i]},{name:"Yoga & Wellness",match:[/yoga/i,/wellness/i,/flow/i,/zen/i,/meditat/i]},{name:"Gothic",match:[/gothic/i,/skull/i,/horror/i,/metal/i]},{name:"Gen Z T-Shirts",match:[/gen\s*z/i,/street/i,/y2k/i]},{name:"Oversized T-Shirts",match:[/oversized/i,/boxy/i,/relaxed/i]},{name:"Graphic T-Shirts",match:[/graphic/i,/print/i,/art/i,/logo/i]},{name:"Minimal T-Shirts",match:[/minimal/i,/solid/i,/plain/i,/essential/i]}]};function o(e){return e.trim().toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-")}e.s(["applyProductFilters",0,function(e,t){let r=(t.category??"").trim().toLowerCase(),a=(t.subCategory??"").trim().toLowerCase();o(t.subCategory??"");let i=(t.audience??"").trim().toLowerCase(),s=(t.q??"").trim().toLowerCase();return e.filter(e=>{let t=!r||e.categorySlug?.toLowerCase()===r||e.category?.toLowerCase()===r,o=!a||e.subCategorySlug?.toLowerCase()===a||e.subCategory?.toLowerCase()===a,n=function(e,t){let r=(t??"").trim().toLowerCase();if(!r)return!0;let a=(e??"").trim().toLowerCase();return"boys"===r?a===r||"unisex"===a:a===r}(e.audienceSlug??e.audience,i),l=!s||e.name.toLowerCase().includes(s)||e.description.toLowerCase().includes(s);return t&&o&&n&&l})},"buildCategoryTree",0,function(e){let a=new Map;for(let t of e){let e=t.category??"Catalog",r=t.categorySlug??o(e),i=t.subCategory??"All",s=t.subCategorySlug??o(i);a.has(e)||a.set(e,{slug:r,subCategories:new Map}),"all"!==s&&a.get(e)?.subCategories.set(i,s)}let i=a.get("T-Shirts");if(i)for(let e of t)i.subCategories.has(e)||i.subCategories.set(e,o(e));return Array.from(a.entries()).map(([e,t])=>({name:e,slug:t.slug,subCategories:Array.from(t.subCategories.entries()).map(([e,t])=>({name:e,slug:t})).sort((t,a)=>{if("T-Shirts"===e){let e=r.get(t.name.toLowerCase()),i=r.get(a.name.toLowerCase());if("number"==typeof e||"number"==typeof i)return(e??Number.MAX_SAFE_INTEGER)-(i??Number.MAX_SAFE_INTEGER)}return t.name.localeCompare(a.name)})})).sort((e,t)=>e.name.localeCompare(t.name))},"deriveProductTaxonomy",0,function(e){var t;let r,n=e.tags??[],l=[e.title,e.productType??"",...n].join(" "),c=a.find(e=>n.some(t=>e.match.some(e=>e.test(t))))??i.find(e=>e.match.some(e=>e.test(l)))??{category:e.productType?.trim()||"Catalog",subCategoryFallback:"All",match:[]},u=s[c.category]??[],m=u.find(e=>n.some(t=>e.match.some(e=>e.test(t))));m||(m=u.find(e=>e.match.some(e=>e.test(l))));let g=m?.name??c.subCategoryFallback,d=(r=[(t=e).title,t.productType??"",...t.tags??[]].join(" "),/\b(unisex|all\s*gender|all\s*genders)\b/i.test(r)?"Unisex":/\b(girl|girls|women|womens|women's|ladies|female)\b/i.test(r)?"Girls":/\b(boy|boys|men|mens|men's|male)\b/i.test(r)?"Boys":"Unisex");return{category:c.category,categorySlug:o(c.category),subCategory:g,subCategorySlug:o(g),audience:d,audienceSlug:o(d)}}])},22024,e=>{"use strict";var t=e.i(47259),r=e.i(65648);let a=process.env.SHOPIFY_API_VERSION??"2025-01",i=`#graphql
  query GetHomeProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          handle
          title
          productType
          tags
          description
          featuredImage {
            url
            altText
          }
          images(first: 20) {
            nodes {
              url
              altText
            }
          }
          media(first: 20) {
            nodes {
              __typename
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
              ... on Video {
                previewImage {
                  url
                  altText
                }
                sources {
                  url
                  mimeType
                }
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          options {
            name
            values
          }
          sizeChartJson: metafield(namespace: "custom", key: "size_chart_json") {
            value
          }
          sizeChart: metafield(namespace: "custom", key: "size_chart") {
            value
          }
          variants(first: 250) {
            edges {
              node {
                id
                title
                availableForSale
                image {
                  url
                  altText
                }
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;function s(e){let t=Number.isFinite(e)?e:0,r=100*Math.ceil(1.2*t/100)-1;return Math.max(t+100,r)}let o={size:"Size",sizes:"Size",fit_size:"Size",uk_size:"Size",us_size:"Size",eu_size:"Size",bust:"Chest",chest:"Chest",chest_cm:"Chest",chest_in:"Chest",chest_width:"Chest",body_chest:"Chest",fit_chest:"To Fit Chest",to_fit_chest:"To Fit Chest",chest_fit:"To Fit Chest",body_fit_chest:"To Fit Chest",waist:"Waist",waist_cm:"Waist",waist_in:"Waist",body_waist:"Waist",hip:"Hip",hips:"Hip",hip_cm:"Hip",hip_in:"Hip",body_hip:"Hip",length:"Length",length_cm:"Length",garment_length:"Length",top_length:"Length",kurta_length:"Length",dress_length:"Length",inseam_length:"Inseam",outseam_length:"Outseam",rise:"Rise",front_rise:"Rise",back_rise:"Rise",shoulder:"Shoulder",shoulder_width:"Shoulder",shoulder_to_shoulder:"Shoulder",sleeve:"Sleeve",sleeve_cm:"Sleeve",sleeve_in:"Sleeve",sleeve_width:"Sleeve",sleeve_opening:"Sleeve",sleeve_length:"Sleeve",armhole:"Armhole",bicep:"Bicep",thigh:"Thigh",calf:"Calf",bottom_opening:"Hem",hem:"Hem",sweep:"Hem",neck:"Neck",neck_opening:"Neck",around:"Around",across_front:"Across Front",across_back:"Across Back",inseam:"Inseam",recommended_height:"Recommended Height",recommended_weight:"Recommended Weight",weight:"Recommended Weight"};function n(e){return e.trim().toLowerCase().replace(/[\s-]+/g,"_")}function l(e){return o[n(e)]??e.replace(/[_-]+/g," ").replace(/\s+/g," ").trim().split(" ").map(e=>{if(!e)return e;let t=e.toUpperCase();return"CM"===t||"MM"===t||"IN"===t||"INCH"===t?t:e.charAt(0).toUpperCase()+e.slice(1).toLowerCase()}).join(" ")}function c(e){return"string"==typeof e||"number"==typeof e}function u(e,t,r){if(0===e.length)return;let a=Array.from(new Set(e.flatMap(e=>Object.keys(e)))),i=t&&t.length>0?t:a;if(0===i.length)return;let s=[];for(let e of i){let t=l(e);s.includes(t)||s.push(t)}let o=new Map;for(let e of a){let t=l(e),r=o.get(t)??[];r.includes(e)||(r.push(e),o.set(t,r))}let c=e.map(e=>s.map(t=>{let r=(o.get(t)??[t]).map(t=>{let r=n(t);return e[t]??e[t.toLowerCase()]??e[r]}).find(e=>null!=e);return null==r?"-":String(r)}));return{headers:s,rows:c,note:r}}function m(e){if(e)try{return function e(t){if(!t)return;if("string"==typeof t)try{return e(JSON.parse(t))}catch{return}if(Array.isArray(t)){if(0===t.length)return;if(t.every(e=>Array.isArray(e)&&e.every(e=>c(e)))){let e=Math.max(...t.map(e=>Array.isArray(e)?e.length:0));if(0===e)return;let r=Array.from({length:e},(e,t)=>0===t?"Size":`Column ${t+1}`),a=t.map(e=>r.map((t,r)=>{let a=e[r];return null==a?"-":String(a)}));return{headers:r,rows:a}}return t.every(e=>"object"==typeof e&&null!==e&&!Array.isArray(e)&&Object.values(e).every(e=>c(e)))?u(t):void 0}if("object"!=typeof t)return;let r="string"==typeof t.note?t.note:void 0;if(Array.isArray(t.headers)&&Array.isArray(t.rows)){let e=t.headers.filter(e=>"string"==typeof e),a=t.rows.filter(e=>Array.isArray(e)).map(e=>e.map(e=>c(e)?String(e):"-"));if(e.length>0&&a.length>0)return{headers:e,rows:a,note:r}}if(Array.isArray(t.rows)&&t.rows.every(e=>"object"==typeof e&&null!==e&&!Array.isArray(e)&&Object.values(e).every(e=>c(e))))return u(t.rows,Array.isArray(t.headers)?t.headers.filter(e=>"string"==typeof e):void 0,r);for(let a of["data","chart","sizeChart","size_chart","table","measurements"])if(a in t){let i=e(t[a]);if(i)return{...i,note:i.note??r}}let a=Object.entries(t).filter(([e,t])=>e.trim().length>0&&"object"==typeof t&&null!==t&&!Array.isArray(t)).map(([e,t])=>({Size:e,...t}));if(0===a.length)return;let i=a.map(e=>Object.fromEntries(Object.entries(e).filter(([,e])=>c(e)).map(([e,t])=>[e,t])));return i.some(e=>0===Object.keys(e).length)?void 0:u(i,void 0,r)}(JSON.parse(e))}catch{return}}async function g(e=10){let o=process.env.SHOPIFY_STORE_DOMAIN,n=process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;if(!o||!n)return[];let l=`https://${o.replace(/^https?:\/\//,"").replace(/\/$/,"")}/api/${a}/graphql.json`;try{let a=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":n},body:JSON.stringify({query:i,variables:{first:e}}),cache:"no-store"});if(!a.ok)return[];let o=await a.json();return(o.data?.products?.edges??[]).map(({node:e})=>{let a=e.featuredImage?.url??"/cat1.jpg",i=(e.media?.nodes??[]).reduce((t,r)=>{if("Video"===r.__typename){let a=r.sources??[],i=a.find(e=>e.mimeType.toLowerCase().includes("mp4"))??a[0];return i?.url&&t.push({type:"video",src:i.url,thumbnail:r.previewImage?.url??void 0,alt:r.previewImage?.altText??e.title}),t}return"MediaImage"===r.__typename&&r.image?.url&&t.push({type:"image",src:r.image.url,alt:r.image.altText??e.title}),t},[]),o=Array.from(new Set([a,...i.filter(e=>"image"===e.type).map(e=>e.src),...(e.images?.nodes??[]).map(e=>e.url),...(e.variants?.edges??[]).map(({node:e})=>e.image?.url).filter(Boolean)].filter(Boolean))),n=m(e.sizeChartJson?.value)??m(e.sizeChart?.value),l=(0,r.deriveProductTaxonomy)({title:e.title,productType:e.productType,tags:e.tags}),c=(0,t.convertAmount)(Number.parseFloat(e.priceRange.minVariantPrice.amount),(0,t.toSupportedCurrency)(e.priceRange.minVariantPrice.currencyCode),"INR"),u=(0,t.convertAmount)(Number.parseFloat(e.compareAtPriceRange.minVariantPrice.amount),(0,t.toSupportedCurrency)(e.compareAtPriceRange.minVariantPrice.currencyCode),"INR"),g=u>c?u:s(c);return{id:e.id,handle:e.handle,tags:e.tags,category:l.category,categorySlug:l.categorySlug,subCategory:l.subCategory,subCategorySlug:l.subCategorySlug,audience:l.audience,audienceSlug:l.audienceSlug,name:e.title,price:(0,t.formatCurrency)(c,"INR"),priceAmount:c,currencyCode:"INR",oldPrice:(0,t.formatCurrency)(g,"INR"),img:a,galleryImages:o,productMedia:i,description:e.description?.trim()||"Discover premium craftsmanship and modern elegance in this signature piece.",optionGroups:(e.options??[]).map(e=>({name:e.name,values:e.values})),sizeChart:n,variants:(e.variants?.edges??[]).map(({node:e})=>{let r=e.image?.url??a;if(!r)return null;let i=(0,t.convertAmount)(Number.parseFloat(e.price.amount),(0,t.toSupportedCurrency)(e.price.currencyCode),"INR"),o=e.compareAtPrice?(0,t.convertAmount)(Number.parseFloat(e.compareAtPrice.amount),(0,t.toSupportedCurrency)(e.compareAtPrice.currencyCode),"INR"):0,n=o>i?o:s(i);return{id:e.id,name:e.title,availableForSale:e.availableForSale,img:r,price:(0,t.formatCurrency)(i,"INR"),priceAmount:i,currencyCode:"INR",oldPrice:(0,t.formatCurrency)(n,"INR"),options:e.selectedOptions}}).filter(e=>null!==e)}})}catch(e){return console.error("Shopify fetch failed",e),[]}}e.s(["getStorefrontProducts",0,g])}];

//# sourceMappingURL=src_lib_0e3wbtg._.js.map