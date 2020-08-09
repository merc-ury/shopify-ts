"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axios_cookiejar_support_1 = __importDefault(require("axios-cookiejar-support"));
const jsdom_1 = require("jsdom");
const tough_cookie_1 = require("tough-cookie");
axios_cookiejar_support_1.default(axios_1.default); // adds support for cookieJar
const cookieJar = new tough_cookie_1.CookieJar();
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36';
const url = 'https://www.jimmyjazz.com/collections/go-for-gold-by-nike/products/nike-shox-r4-104265-702';
const getProducts = async (uri) => {
    const doc = await jsdom_1.JSDOM.fromURL(uri);
    const products = [];
    // this returns a collection, why isn't there an option to find an element by just its class name?
    const title = doc.window.document.getElementsByTagName('title')[0].innerHTML.trim();
    const sizeNode = doc.window.document.getElementsByClassName('product-single__variants no-js');
    const sizes = sizeNode[0].querySelectorAll('option');
    sizes.forEach(value => {
        if (!value.innerHTML.toLowerCase().includes('sold out')) {
            // TODO: clean up 🤮
            const _size = value.innerHTML.split('-')[0].replace('\n', '').trim();
            const _price = value.innerHTML.split('-')[1].replace('\n', '').replace('$', '').replace('USD', '').trim();
            products.push({
                productName: title,
                price: Number(_price),
                size: _size,
                variantId: Number(value.getAttribute('value').trim())
            });
        }
    });
    return products;
};
const addToCart = async (variantId, size = '') => {
    const endpoint = 'https://www.jimmyjazz.com/cart/add.js';
    const response = await axios_1.default.post(endpoint, {
        form_type: 'product',
        utf8: '%E2%9C%93',
        Size: size,
        id: variantId
    }, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    return response.status;
};
const getCart = async () => {
    const endpoint = 'https://www.jimmyjazz.com/cart.js';
    const response = await axios_1.default.get(endpoint, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    // TODO: generate interface for response 
    return response.data.item_count;
};
const checkout = async () => {
    const checkoutEndpoint = 'https://www.jimmyjazz.com/checkout.json';
    const checkoutResponse = await axios_1.default.get(checkoutEndpoint, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    const redirectUrl = checkoutResponse.headers['set-cookie'][1];
    const redirectStrings = redirectUrl.split(';');
    const locationEndpoint = `https://www.jimmyjazz.com${redirectStrings[1].split('=')[1].trim()}`;
    console.log(locationEndpoint);
    const data = {
        'checkout[email]': 'test@gmail.com',
        'checkout[shipping_address][first_name]': 'Test',
        'checkout[shipping_address][last_name]': 'Test',
        'checkout[shipping_address][address1]': '7000 TEST STREET',
        'checkout[shipping_address][city]': 'CITY',
        'checkout[shipping_address][country]': 'US',
        'checkout[shipping_address][province]': 'STATE',
        'checkout[shipping_address][zip]': 1,
        'checkout[shipping_address][phone]': 1,
        _method: 'patch'
    };
    const locationResponse = await axios_1.default.post(locationEndpoint, {
        _method: 'patch'
    }, {
        httpAgent: userAgent,
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        jar: cookieJar,
        withCredentials: true
    });
    return locationResponse.status;
};
// Main function (IIFE)
(async () => {
    const products = await getProducts(url);
    if (await addToCart(products[0].variantId, products[0].size) === 200)
        console.log('Successfully added ' + products[0].size);
    console.log(`Items in Cart: ${await getCart()}`);
    await checkout();
})();
