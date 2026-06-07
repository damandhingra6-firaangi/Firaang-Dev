module.exports=[77776,77204,95483,a=>{"use strict";function b(a,b){for(let b of a){let a=process.env[b];if(!a)continue;let c=Number.parseFloat(a);if(Number.isFinite(c)&&c>0)return c}return b}a.s(["fallbackProducts",0,[{id:"fallback-1",name:"Bohemian Maxi Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Bohemian Dresses",subCategorySlug:"bohemian-dresses",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat1.jpg",description:"A flowing silhouette with artisan embroidery and lightweight comfort for festive evenings."},{id:"fallback-2",name:"Celestial Drop Pendant",category:"Jewelry",categorySlug:"jewelry",subCategory:"Pendant",subCategorySlug:"pendant",price:"₹4,999",priceAmount:4999,currencyCode:"INR",oldPrice:"₹6,999",img:"/cat2.jpg",description:"Elegant handcrafted pendant with celestial detailing, designed to elevate everyday looks."},{id:"fallback-3",name:"Palazzo Fusion Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Palazzo Set",subCategorySlug:"palazzo-set",price:"₹6,999",priceAmount:6999,currencyCode:"INR",oldPrice:"₹9,999",img:"/hero.jpg",description:"Contemporary fusion set with soft drape and versatile styling for day-to-night wear."},{id:"fallback-4",name:"Gemstone",category:"Jewelry",categorySlug:"jewelry",subCategory:"Gemstone Jewelry",subCategorySlug:"gemstone-jewelry",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat4.jpg",description:"Statement accessory inspired by traditional textures and modern luxury aesthetics."},{id:"fallback-5",name:"Luxe Evening Gown",category:"Dresses",categorySlug:"dresses",subCategory:"Evening Gown",subCategorySlug:"evening-gown",price:"₹15,999",priceAmount:15999,currencyCode:"INR",oldPrice:"",img:"/cat3.jpg",description:"A dramatic evening profile with rich fabric movement and flattering structured tailoring."},{id:"fallback-6",name:"Royal Kundan Collar",category:"Jewelry",categorySlug:"jewelry",subCategory:"Kundan Jewelry",subCategorySlug:"kundan-jewelry",price:"₹10,999",priceAmount:10999,currencyCode:"INR",oldPrice:"₹14,999",img:"/cat2.jpg",description:"Ornate kundan work with a regal finish, crafted to anchor your festive wardrobe."},{id:"fallback-7",name:"Midnight Kurta Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Kurta Set",subCategorySlug:"kurta-set",price:"₹8,499",priceAmount:8499,currencyCode:"INR",oldPrice:"₹11,999",img:"/cat3.jpg",description:"Refined kurta set in deep tones with clean lines and subtle festive detailing."},{id:"fallback-8",name:"Scarlet Draped Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Draped Dress",subCategorySlug:"draped-dress",price:"₹13,999",priceAmount:13999,currencyCode:"INR",oldPrice:"₹17,999",img:"/hero.jpg",description:"Bold draped silhouette in a rich scarlet shade, made for standout celebratory moments."}]],77776);let c={INR:1,USD:b(["NEXT_PUBLIC_FX_USD_TO_INR","FX_USD_TO_INR"],83),AED:b(["NEXT_PUBLIC_FX_AED_TO_INR","FX_AED_TO_INR"],22.6)},d={INR:"en-IN",USD:"en-US",AED:"en-AE"};function e(a){let b=(a??"").toUpperCase();return"USD"===b||"AED"===b?b:"INR"}function f(a,b,d){return Number.isFinite(a)?b===d?a:a*c[b]/c[d]:0}function g(a,b){return new Intl.NumberFormat(d[b],{style:"currency",currency:b,maximumFractionDigits:2*("INR"!==b)}).format(a)}let h=["Devotional","Mandala Magic","Animal","Games & Sports","Anime Art","Dark Art","Abstract Art","Motivation","Yoga & Wellness","Gothic","Gen Z T-Shirts","Oversized T-Shirts","Graphic T-Shirts","Minimal T-Shirts"],i=new Map(h.map((a,b)=>[a.toLowerCase(),b])),j=[{category:"Half-Shirts",subCategoryFallback:"All Half-Shirts",match:[/\bhalf[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*half[-_\s]?shirts?\b/i]},{category:"T-Shirts",subCategoryFallback:"Classic T-Shirts",match:[/\bt[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*t[-_\s]?shirts?\b/i]},{category:"Hoodies",subCategoryFallback:"All Hoodies",match:[/\bhoodies?\b/i,/\bcategory\s*[:=]\s*hoodies?\b/i]},{category:"Sweatshirts",subCategoryFallback:"All Sweatshirts",match:[/\bsweat[-_\s]?shirts?\b/i,/\bcategory\s*[:=]\s*sweat[-_\s]?shirts?\b/i]},{category:"Caps",subCategoryFallback:"All Caps",match:[/\bcaps?\b/i,/\bcategory\s*[:=]\s*caps?\b/i]}],k=[{category:"Half-Shirts",subCategoryFallback:"All Half-Shirts",match:[/half[-\s]?shirt/i,/short[-\s]?sleeve[-\s]?shirt/i,/half[-\s]?sleeve/i]},{category:"Hoodies",subCategoryFallback:"All Hoodies",match:[/hoodie/i]},{category:"Sweatshirts",subCategoryFallback:"All Sweatshirts",match:[/sweat[-\s]?shirt/i]},{category:"T-Shirts",subCategoryFallback:"Classic T-Shirts",match:[/t[-\s]?shirt/i,/tee/i]},{category:"Caps",subCategoryFallback:"All Caps",match:[/\bcap\b/i,/snapback/i,/baseball\s*cap/i,/trucker\s*cap/i]},{category:"Dresses",subCategoryFallback:"Everyday Dresses",match:[/dress/i,/gown/i]},{category:"Ethnic Wear",subCategoryFallback:"Ethnic Sets",match:[/kurta/i,/palazzo/i,/anarkali/i,/lehenga/i]},{category:"Jewelry",subCategoryFallback:"Accessories",match:[/jewel/i,/pendant/i,/kundan/i,/necklace/i,/gem/i]}],l={"T-Shirts":[{name:"Mandala Magic",match:[/mandala/i,/mandala\s*magic/i,/mandalamagic/i]},{name:"Devotional",match:[/\bshiv\b/i,/\bshiva\b/i,/\bmahadev\b/i,/\bhanuman\b/i,/\bkrishna\b/i,/\bram\b/i,/\bom\b/i,/\bdevotional\b/i,/\bspiritual\b/i,/\bbhakti\b/i,/\bganesh\b/i]},{name:"Animal",match:[/animal/i,/cat/i,/dog/i,/tiger/i,/lion/i,/wolf/i,/eagle/i,/panther/i,/bear/i]},{name:"Games & Sports",match:[/game/i,/gaming/i,/esports/i,/football/i,/cricket/i,/tennis/i,/basketball/i,/sport/i]},{name:"Anime Art",match:[/anime/i,/manga/i,/otaku/i]},{name:"Dark Art",match:[/dark/i,/occult/i,/noir/i,/grim/i]},{name:"Abstract Art",match:[/abstract/i,/geometry/i,/pattern/i]},{name:"Motivation",match:[/motivat/i,/hustle/i,/mindset/i,/discipline/i,/focus/i]},{name:"Yoga & Wellness",match:[/yoga/i,/wellness/i,/flow/i,/zen/i,/meditat/i]},{name:"Gothic",match:[/gothic/i,/skull/i,/horror/i,/metal/i]},{name:"Gen Z T-Shirts",match:[/gen\s*z/i,/street/i,/y2k/i]},{name:"Oversized T-Shirts",match:[/oversized/i,/boxy/i,/relaxed/i]},{name:"Graphic T-Shirts",match:[/graphic/i,/print/i,/art/i,/logo/i]},{name:"Minimal T-Shirts",match:[/minimal/i,/solid/i,/plain/i,/essential/i]}]};function m(a){return a.trim().toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-")}function n(a){var b;let c,d=a.tags??[],e=[a.title,a.productType??"",...d].join(" "),f=j.find(a=>d.some(b=>a.match.some(a=>a.test(b))))??k.find(a=>a.match.some(a=>a.test(e)))??{category:a.productType?.trim()||"Catalog",subCategoryFallback:"All",match:[]},g=l[f.category]??[],h=g.find(a=>d.some(b=>a.match.some(a=>a.test(b))));h||(h=g.find(a=>a.match.some(a=>a.test(e))));let i=h?.name??f.subCategoryFallback,n=(c=[(b=a).title,b.productType??"",...b.tags??[]].join(" "),/\b(unisex|all\s*gender|all\s*genders)\b/i.test(c)?"Unisex":/\b(girl|girls|women|womens|women's|ladies|female)\b/i.test(c)?"Girls":/\b(boy|boys|men|mens|men's|male)\b/i.test(c)?"Boys":"Unisex");return{category:f.category,categorySlug:m(f.category),subCategory:i,subCategorySlug:m(i),audience:n,audienceSlug:m(n)}}a.s(["buildCategoryTree",0,function(a){let b=new Map;for(let c of a){let a=c.category??"Catalog",d=c.categorySlug??m(a),e=c.subCategory??"All",f=c.subCategorySlug??m(e);b.has(a)||b.set(a,{slug:d,subCategories:new Map}),"all"!==f&&b.get(a)?.subCategories.set(e,f)}let c=b.get("T-Shirts");if(c)for(let a of h)c.subCategories.has(a)||c.subCategories.set(a,m(a));return Array.from(b.entries()).map(([a,b])=>({name:a,slug:b.slug,subCategories:Array.from(b.subCategories.entries()).map(([a,b])=>({name:a,slug:b})).sort((b,c)=>{if("T-Shirts"===a){let a=i.get(b.name.toLowerCase()),d=i.get(c.name.toLowerCase());if("number"==typeof a||"number"==typeof d)return(a??Number.MAX_SAFE_INTEGER)-(d??Number.MAX_SAFE_INTEGER)}return b.name.localeCompare(c.name)})})).sort((a,b)=>a.name.localeCompare(b.name))},"deriveProductTaxonomy",0,n,"slugify",0,m],77204);let o=process.env.SHOPIFY_API_VERSION??"2025-01",p=`#graphql
  query GetHomeProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
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
`;function q(a){let b=Number.isFinite(a)?a:0,c=100*Math.ceil(1.2*b/100)-1;return Math.max(b+100,c)}let r={size:"Size",sizes:"Size",fit_size:"Size",uk_size:"Size",us_size:"Size",eu_size:"Size",bust:"Chest",chest:"Chest",chest_cm:"Chest",chest_in:"Chest",chest_width:"Chest",body_chest:"Chest",fit_chest:"To Fit Chest",to_fit_chest:"To Fit Chest",chest_fit:"To Fit Chest",body_fit_chest:"To Fit Chest",waist:"Waist",waist_cm:"Waist",waist_in:"Waist",body_waist:"Waist",hip:"Hip",hips:"Hip",hip_cm:"Hip",hip_in:"Hip",body_hip:"Hip",length:"Length",length_cm:"Length",garment_length:"Length",top_length:"Length",kurta_length:"Length",dress_length:"Length",inseam_length:"Inseam",outseam_length:"Outseam",rise:"Rise",front_rise:"Rise",back_rise:"Rise",shoulder:"Shoulder",shoulder_width:"Shoulder",shoulder_to_shoulder:"Shoulder",sleeve:"Sleeve",sleeve_cm:"Sleeve",sleeve_in:"Sleeve",sleeve_width:"Sleeve",sleeve_opening:"Sleeve",sleeve_length:"Sleeve",armhole:"Armhole",bicep:"Bicep",thigh:"Thigh",calf:"Calf",bottom_opening:"Hem",hem:"Hem",sweep:"Hem",neck:"Neck",neck_opening:"Neck",around:"Around",across_front:"Across Front",across_back:"Across Back",inseam:"Inseam",recommended_height:"Recommended Height",recommended_weight:"Recommended Weight",weight:"Recommended Weight"};function s(a){return a.trim().toLowerCase().replace(/[\s-]+/g,"_")}function t(a){return r[s(a)]??a.replace(/[_-]+/g," ").replace(/\s+/g," ").trim().split(" ").map(a=>{if(!a)return a;let b=a.toUpperCase();return"CM"===b||"MM"===b||"IN"===b||"INCH"===b?b:a.charAt(0).toUpperCase()+a.slice(1).toLowerCase()}).join(" ")}function u(a){return"string"==typeof a||"number"==typeof a}function v(a,b,c){if(0===a.length)return;let d=Array.from(new Set(a.flatMap(a=>Object.keys(a)))),e=b&&b.length>0?b:d;if(0===e.length)return;let f=[];for(let a of e){let b=t(a);f.includes(b)||f.push(b)}let g=new Map;for(let a of d){let b=t(a),c=g.get(b)??[];c.includes(a)||(c.push(a),g.set(b,c))}let h=a.map(a=>f.map(b=>{let c=(g.get(b)??[b]).map(b=>{let c=s(b);return a[b]??a[b.toLowerCase()]??a[c]}).find(a=>null!=a);return null==c?"-":String(c)}));return{headers:f,rows:h,note:c}}function w(a){if(a)try{return function a(b){if(!b)return;if("string"==typeof b)try{return a(JSON.parse(b))}catch{return}if(Array.isArray(b)){if(0===b.length)return;if(b.every(a=>Array.isArray(a)&&a.every(a=>u(a)))){let a=Math.max(...b.map(a=>Array.isArray(a)?a.length:0));if(0===a)return;let c=Array.from({length:a},(a,b)=>0===b?"Size":`Column ${b+1}`),d=b.map(a=>c.map((b,c)=>{let d=a[c];return null==d?"-":String(d)}));return{headers:c,rows:d}}return b.every(a=>"object"==typeof a&&null!==a&&!Array.isArray(a)&&Object.values(a).every(a=>u(a)))?v(b):void 0}if("object"!=typeof b)return;let c="string"==typeof b.note?b.note:void 0;if(Array.isArray(b.headers)&&Array.isArray(b.rows)){let a=b.headers.filter(a=>"string"==typeof a),d=b.rows.filter(a=>Array.isArray(a)).map(a=>a.map(a=>u(a)?String(a):"-"));if(a.length>0&&d.length>0)return{headers:a,rows:d,note:c}}if(Array.isArray(b.rows)&&b.rows.every(a=>"object"==typeof a&&null!==a&&!Array.isArray(a)&&Object.values(a).every(a=>u(a))))return v(b.rows,Array.isArray(b.headers)?b.headers.filter(a=>"string"==typeof a):void 0,c);for(let d of["data","chart","sizeChart","size_chart","table","measurements"])if(d in b){let e=a(b[d]);if(e)return{...e,note:e.note??c}}let d=Object.entries(b).filter(([a,b])=>a.trim().length>0&&"object"==typeof b&&null!==b&&!Array.isArray(b)).map(([a,b])=>({Size:a,...b}));if(0===d.length)return;let e=d.map(a=>Object.fromEntries(Object.entries(a).filter(([,a])=>u(a)).map(([a,b])=>[a,b])));return e.some(a=>0===Object.keys(a).length)?void 0:v(e,void 0,c)}(JSON.parse(a))}catch{return}}async function x(a=10){let b=process.env.SHOPIFY_STORE_DOMAIN,c=process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;if(!b||!c)return[];let d=`https://${b.replace(/^https?:\/\//,"").replace(/\/$/,"")}/api/${o}/graphql.json`,h=Math.max(1,Math.min(a,1e3)),i=Math.min(250,h);try{let a=[],b=null,j=!0;for(;j&&a.length<h;){let e=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":c},body:JSON.stringify({query:p,variables:{first:Math.min(i,h-a.length),after:b}}),cache:"no-store"});if(!e.ok)return[];let f=await e.json(),g=f.data?.products?.edges??[],k=f.data?.products?.pageInfo;if(a.push(...g),j=!!k?.hasNextPage,!(b=k?.endCursor??null))break}return a.slice(0,h).map(({node:a})=>{let b=a.featuredImage?.url??"/cat1.jpg",c=(a.media?.nodes??[]).reduce((b,c)=>{if("Video"===c.__typename){let d=c.sources??[],e=d.find(a=>a.mimeType.toLowerCase().includes("mp4"))??d[0];return e?.url&&b.push({type:"video",src:e.url,thumbnail:c.previewImage?.url??void 0,alt:c.previewImage?.altText??a.title}),b}return"MediaImage"===c.__typename&&c.image?.url&&b.push({type:"image",src:c.image.url,alt:c.image.altText??a.title}),b},[]),d=Array.from(new Set([b,...c.filter(a=>"image"===a.type).map(a=>a.src),...(a.images?.nodes??[]).map(a=>a.url),...(a.variants?.edges??[]).map(({node:a})=>a.image?.url).filter(Boolean)].filter(Boolean))),h=w(a.sizeChartJson?.value)??w(a.sizeChart?.value),i=n({title:a.title,productType:a.productType,tags:a.tags}),j=f(Number.parseFloat(a.priceRange.minVariantPrice.amount),e(a.priceRange.minVariantPrice.currencyCode),"INR"),k=f(Number.parseFloat(a.compareAtPriceRange.minVariantPrice.amount),e(a.compareAtPriceRange.minVariantPrice.currencyCode),"INR"),l=k>j?k:q(j);return{id:a.id,handle:a.handle,tags:a.tags,category:i.category,categorySlug:i.categorySlug,subCategory:i.subCategory,subCategorySlug:i.subCategorySlug,audience:i.audience,audienceSlug:i.audienceSlug,name:a.title,price:g(j,"INR"),priceAmount:j,currencyCode:"INR",oldPrice:g(l,"INR"),img:b,galleryImages:d,productMedia:c,description:a.description?.trim()||"Discover premium craftsmanship and modern elegance in this signature piece.",optionGroups:(a.options??[]).map(a=>({name:a.name,values:a.values})),sizeChart:h,variants:(a.variants?.edges??[]).map(({node:a})=>{let c=a.image?.url??b;if(!c)return null;let d=f(Number.parseFloat(a.price.amount),e(a.price.currencyCode),"INR"),h=a.compareAtPrice?f(Number.parseFloat(a.compareAtPrice.amount),e(a.compareAtPrice.currencyCode),"INR"):0,i=h>d?h:q(d);return{id:a.id,name:a.title,availableForSale:a.availableForSale,img:c,price:g(d,"INR"),priceAmount:d,currencyCode:"INR",oldPrice:g(i,"INR"),options:a.selectedOptions}}).filter(a=>null!==a)}})}catch(a){return console.error("Shopify fetch failed",a),[]}}a.s(["getStorefrontProducts",0,x],95483)}];

//# sourceMappingURL=src_lib_catalog_ts_0j~g8ql._.js.map