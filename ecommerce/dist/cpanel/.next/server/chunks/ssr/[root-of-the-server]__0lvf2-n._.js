module.exports=[93695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},50640,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"InvariantError",{enumerable:!0,get:function(){return d}});class d extends Error{constructor(a,b){super(`Invariant: ${a.endsWith(".")?a:a+"."} This is a bug in Next.js.`,b),this.name="InvariantError"}}},77776,77204,95483,a=>{"use strict";a.s(["fallbackProducts",0,[{id:"fallback-1",name:"Bohemian Maxi Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Bohemian Dresses",subCategorySlug:"bohemian-dresses",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat1.jpg",description:"A flowing silhouette with artisan embroidery and lightweight comfort for festive evenings."},{id:"fallback-2",name:"Celestial Drop Pendant",category:"Jewelry",categorySlug:"jewelry",subCategory:"Pendant",subCategorySlug:"pendant",price:"₹4,999",priceAmount:4999,currencyCode:"INR",oldPrice:"₹6,999",img:"/cat2.jpg",description:"Elegant handcrafted pendant with celestial detailing, designed to elevate everyday looks."},{id:"fallback-3",name:"Palazzo Fusion Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Palazzo Set",subCategorySlug:"palazzo-set",price:"₹6,999",priceAmount:6999,currencyCode:"INR",oldPrice:"₹9,999",img:"/hero.jpg",description:"Contemporary fusion set with soft drape and versatile styling for day-to-night wear."},{id:"fallback-4",name:"Gemstone",category:"Jewelry",categorySlug:"jewelry",subCategory:"Gemstone Jewelry",subCategorySlug:"gemstone-jewelry",price:"₹12,999",priceAmount:12999,currencyCode:"INR",oldPrice:"₹18,999",img:"/cat4.jpg",description:"Statement accessory inspired by traditional textures and modern luxury aesthetics."},{id:"fallback-5",name:"Luxe Evening Gown",category:"Dresses",categorySlug:"dresses",subCategory:"Evening Gown",subCategorySlug:"evening-gown",price:"₹15,999",priceAmount:15999,currencyCode:"INR",oldPrice:"",img:"/cat3.jpg",description:"A dramatic evening profile with rich fabric movement and flattering structured tailoring."},{id:"fallback-6",name:"Royal Kundan Collar",category:"Jewelry",categorySlug:"jewelry",subCategory:"Kundan Jewelry",subCategorySlug:"kundan-jewelry",price:"₹10,999",priceAmount:10999,currencyCode:"INR",oldPrice:"₹14,999",img:"/cat2.jpg",description:"Ornate kundan work with a regal finish, crafted to anchor your festive wardrobe."},{id:"fallback-7",name:"Midnight Kurta Set",category:"Ethnic Wear",categorySlug:"ethnic-wear",subCategory:"Kurta Set",subCategorySlug:"kurta-set",price:"₹8,499",priceAmount:8499,currencyCode:"INR",oldPrice:"₹11,999",img:"/cat3.jpg",description:"Refined kurta set in deep tones with clean lines and subtle festive detailing."},{id:"fallback-8",name:"Scarlet Draped Dress",category:"Dresses",categorySlug:"dresses",subCategory:"Draped Dress",subCategorySlug:"draped-dress",price:"₹13,999",priceAmount:13999,currencyCode:"INR",oldPrice:"₹17,999",img:"/hero.jpg",description:"Bold draped silhouette in a rich scarlet shade, made for standout celebratory moments."}]],77776);let b=[{category:"T-Shirts",subCategoryFallback:"Classic T-Shirts",match:[/t[-\s]?shirt/i,/tee/i]},{category:"Dresses",subCategoryFallback:"Everyday Dresses",match:[/dress/i,/gown/i]},{category:"Ethnic Wear",subCategoryFallback:"Ethnic Sets",match:[/kurta/i,/palazzo/i,/anarkali/i,/lehenga/i]},{category:"Jewelry",subCategoryFallback:"Accessories",match:[/jewel/i,/pendant/i,/kundan/i,/necklace/i,/gem/i]}],c={"T-Shirts":[{name:"Gen Z T-Shirts",match:[/gen\s*z/i,/street/i,/y2k/i]},{name:"Oversized T-Shirts",match:[/oversized/i,/boxy/i,/relaxed/i]},{name:"Graphic T-Shirts",match:[/graphic/i,/print/i,/art/i,/logo/i]},{name:"Minimal T-Shirts",match:[/minimal/i,/solid/i,/plain/i,/essential/i]}]};function d(a){return a.trim().toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-")}function e(a){let e=[a.title,a.productType??"",...a.tags??[]].join(" "),f=b.find(a=>a.match.some(a=>a.test(e)))??{category:a.productType?.trim()||"Catalog",subCategoryFallback:"All",match:[]},g=(c[f.category]??[]).find(a=>a.match.some(a=>a.test(e))),h=g?.name??f.subCategoryFallback;return{category:f.category,categorySlug:d(f.category),subCategory:h,subCategorySlug:d(h)}}a.s(["buildCategoryTree",0,function(a){let b=new Map;for(let c of a){let a=c.category??"Catalog",e=c.categorySlug??d(a),f=c.subCategory??"All",g=c.subCategorySlug??d(f);b.has(a)||b.set(a,{slug:e,subCategories:new Map}),b.get(a)?.subCategories.set(f,g)}return Array.from(b.entries()).map(([a,b])=>({name:a,slug:b.slug,subCategories:Array.from(b.subCategories.entries()).map(([a,b])=>({name:a,slug:b}))})).sort((a,b)=>a.name.localeCompare(b.name))},"deriveProductTaxonomy",0,e],77204);let f=process.env.SHOPIFY_API_VERSION??"2025-01",g=`#graphql
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
`;function h(a,b){let c=Number.parseFloat(a);return Number.isNaN(c)?a:new Intl.NumberFormat("en-IN",{style:"currency",currency:b,maximumFractionDigits:0}).format(c)}let i={size:"Size",sizes:"Size",fit_size:"Size",uk_size:"Size",us_size:"Size",eu_size:"Size",bust:"Chest",chest:"Chest",chest_cm:"Chest",chest_in:"Chest",chest_width:"Chest",body_chest:"Chest",fit_chest:"To Fit Chest",to_fit_chest:"To Fit Chest",chest_fit:"To Fit Chest",body_fit_chest:"To Fit Chest",waist:"Waist",waist_cm:"Waist",waist_in:"Waist",body_waist:"Waist",hip:"Hip",hips:"Hip",hip_cm:"Hip",hip_in:"Hip",body_hip:"Hip",length:"Length",length_cm:"Length",garment_length:"Length",top_length:"Length",kurta_length:"Length",dress_length:"Length",inseam_length:"Inseam",outseam_length:"Outseam",rise:"Rise",front_rise:"Rise",back_rise:"Rise",shoulder:"Shoulder",shoulder_width:"Shoulder",shoulder_to_shoulder:"Shoulder",sleeve:"Sleeve",sleeve_cm:"Sleeve",sleeve_in:"Sleeve",sleeve_width:"Sleeve",sleeve_opening:"Sleeve",sleeve_length:"Sleeve",armhole:"Armhole",bicep:"Bicep",thigh:"Thigh",calf:"Calf",bottom_opening:"Hem",hem:"Hem",sweep:"Hem",neck:"Neck",neck_opening:"Neck",around:"Around",across_front:"Across Front",across_back:"Across Back",inseam:"Inseam",recommended_height:"Recommended Height",recommended_weight:"Recommended Weight",weight:"Recommended Weight"};function j(a){return a.trim().toLowerCase().replace(/[\s-]+/g,"_")}function k(a){return i[j(a)]??a.replace(/[_-]+/g," ").replace(/\s+/g," ").trim().split(" ").map(a=>{if(!a)return a;let b=a.toUpperCase();return"CM"===b||"MM"===b||"IN"===b||"INCH"===b?b:a.charAt(0).toUpperCase()+a.slice(1).toLowerCase()}).join(" ")}function l(a){if(a)try{let b=JSON.parse(a);if("object"!=typeof b||null===b||!("rows"in b))return;let c=b.headers,d=b.rows,e=b.note;if(Array.isArray(c)&&c.every(a=>"string"==typeof a)&&Array.isArray(d)&&d.every(a=>Array.isArray(a)&&a.every(a=>"string"==typeof a)))return{headers:c,rows:d,note:"string"==typeof e?e:void 0};if(Array.isArray(d)&&d.length>0&&d.every(a=>"object"==typeof a&&null!==a&&!Array.isArray(a)&&Object.values(a).every(a=>"string"==typeof a||"number"==typeof a))){let a=Array.from(new Set(d.flatMap(a=>Object.keys(a)))),b=Array.isArray(c)&&c.every(a=>"string"==typeof a)?c:a,f=[];for(let a of b){let b=k(a);f.includes(b)||f.push(b)}let g=new Map;for(let b of a){let a=k(b),c=g.get(a)??[];c.includes(b)||(c.push(b),g.set(a,c))}let h=d.map(a=>f.map(b=>{let c=(g.get(b)??[b]).map(b=>{let c=j(b);return a[b]??a[b.toLowerCase()]??a[c]}).find(a=>null!=a);return null==c?"-":String(c)}));return{headers:f,rows:h,note:"string"==typeof e?e:void 0}}}catch{}}async function m(a=10){let b=process.env.SHOPIFY_STORE_DOMAIN,c=process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;if(!b||!c)return[];let d=`https://${b.replace(/^https?:\/\//,"").replace(/\/$/,"")}/api/${f}/graphql.json`,i=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":c},body:JSON.stringify({query:g,variables:{first:a}}),cache:"no-store"});if(!i.ok)return[];let j=await i.json();return(j.data?.products?.edges??[]).map(({node:a})=>{let b=a.featuredImage?.url??"/cat1.jpg",c=l(a.sizeChartJson?.value)??l(a.sizeChart?.value),d=e({title:a.title,productType:a.productType,tags:a.tags});return{id:a.id,handle:a.handle,category:d.category,categorySlug:d.categorySlug,subCategory:d.subCategory,subCategorySlug:d.subCategorySlug,name:a.title,price:h(a.priceRange.minVariantPrice.amount,a.priceRange.minVariantPrice.currencyCode),priceAmount:Number.parseFloat(a.priceRange.minVariantPrice.amount),currencyCode:a.priceRange.minVariantPrice.currencyCode,oldPrice:h(a.compareAtPriceRange.minVariantPrice.amount,a.compareAtPriceRange.minVariantPrice.currencyCode),img:b,description:a.description?.trim()||"Discover premium craftsmanship and modern elegance in this signature piece.",optionGroups:(a.options??[]).map(a=>({name:a.name,values:a.values})),sizeChart:c,variants:(a.variants?.edges??[]).map(({node:a})=>{let c=a.image?.url??b;return c?{id:a.id,name:a.title,availableForSale:a.availableForSale,img:c,price:h(a.price.amount,a.price.currencyCode),priceAmount:Number.parseFloat(a.price.amount),currencyCode:a.price.currencyCode,oldPrice:a.compareAtPrice?h(a.compareAtPrice.amount,a.compareAtPrice.currencyCode):"",options:a.selectedOptions}:null}).filter(a=>null!==a)}})}a.s(["getStorefrontProducts",0,m],95483)},31959,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/components/Navbar.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/components/Navbar.tsx <module evaluation>","default")},57779,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/components/Navbar.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/components/Navbar.tsx","default")},10356,a=>{"use strict";a.i(31959);var b=a.i(57779);a.n(b)},90517,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/components/ShopListing.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/components/ShopListing.tsx <module evaluation>","default")},99046,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/components/ShopListing.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/components/ShopListing.tsx","default")},35870,a=>{"use strict";a.i(90517);var b=a.i(99046);a.n(b)},10585,a=>{a.v("/_next/static/media/favicon.0x3dzn~oxb6tn.ico"+(globalThis.NEXT_CLIENT_ASSET_SUFFIX||""))},68611,a=>{"use strict";let b={src:a.i(10585).default,width:256,height:256};a.s(["default",0,b])},43739,a=>{"use strict";var b=a.i(7997),c=a.i(10356),d=a.i(35870),e=a.i(77776),f=a.i(95483);async function g({searchParams:a}){let h=a?await a:void 0,i=h?.q??"",j=h?.category??"",k=h?.subCategory??"",l=await (0,f.getStorefrontProducts)(40),m=l.length>0?l:e.fallbackProducts;return(0,b.jsxs)("main",{children:[(0,b.jsx)(c.default,{}),(0,b.jsx)("div",{className:"h-24 md:h-28"}),(0,b.jsx)(d.default,{products:m,initialQuery:i,initialCategory:j,initialSubCategory:k})]})}a.s(["default",0,g])},68497,a=>{a.n(a.i(43739))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0lvf2-n._.js.map