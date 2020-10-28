"use strict";
/*
    TODO: Separate code into different classes/functions
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axios_cookiejar_support_1 = __importDefault(require("axios-cookiejar-support"));
const qs_1 = __importDefault(require("qs"));
const fs_1 = require("fs");
const jsdom_1 = require("jsdom");
const tough_cookie_1 = require("tough-cookie");
axios_cookiejar_support_1.default(axios_1.default); // adds support for cookieJar
const cookieJar = new tough_cookie_1.CookieJar();
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36';
const url = 'https://www.jimmyjazz.com/products/nike-air-max-90-royal-cd0881-102';
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
    const data = qs_1.default.stringify({
        form_type: 'product',
        utf8: '%E2%9C%93',
        Size: size,
        id: variantId
    });
    const response = await axios_1.default.post(endpoint, data, {
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
let locationEndpoint = '';
const postShippingInfo = async () => {
    const checkoutEndpoint = 'https://www.jimmyjazz.com/checkout.json';
    const checkoutResponse = await axios_1.default.get(checkoutEndpoint, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    // TODO: clean up 🤡
    const redirectUrl = checkoutResponse.headers['set-cookie'][1];
    const redirectStrings = redirectUrl.split(';');
    const redirectEndpoint = `https://www.jimmyjazz.com${redirectStrings[1].split('=')[1].trim()}`;
    console.log('Redirect URL: ' + redirectEndpoint);
    locationEndpoint = redirectEndpoint;
    const authToken = await getAuthToken(redirectEndpoint);
    const data = qs_1.default.stringify({
        '_method': 'patch',
        'authenticity_token': '',
        'checkout[email]': 'email@gmail.com',
        'checkout[shipping_address][first_name]': 'FirstName',
        'checkout[shipping_address][last_name]': 'LastName',
        'checkout[shipping_address][address1]': '1000 Test Circle',
        'checkout[shipping_address][address2]': '',
        'checkout[shipping_address][city]': 'CITY',
        'checkout[shipping_address][country]': 'United+States',
        'checkout[shipping_address][province]': 'CA',
        'checkout[shipping_address][zip]': '11111',
        'checkout[shipping_address][phone]': '(423) 111-1111',
        'previous_step': 'contact_information',
        'step': 'shipping_method',
    });
    const temp = await axios_1.default.post(redirectEndpoint, data, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    await fs_1.writeFile('response.txt', temp.data, () => {
        console.log('Wrote to response.txt...');
    });
    const data2 = qs_1.default.stringify({
        '_method': 'patch',
        'checkout[shipping_rate][id]': 'shopify-Standard%20Shipping-9.95',
        'previous_step': 'shipping_method',
        'step': 'payment_method'
    });
    const locationResponse = await axios_1.default.post(redirectEndpoint, data2, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    return locationResponse.status;
};
const getAuthToken = async (uri) => {
    const doc = await jsdom_1.JSDOM.fromURL(uri);
    console.log(doc.window.document.title);
    //console.log(dom.window.document.getElementById('shopify-digital-wallet')?.innerHTML);
    return '';
};
const postCCInfo = async () => {
    const ccEndpoint = 'https://deposit.us.shopifycs.com/sessions';
    const ccData = JSON.stringify({
        credit_card: {
            number: '1111 1111 1111 1111',
            name: 'FIRSTNAME LASTNAME',
            month: 1,
            year: 3000,
            verification_value: '111'
        }
    });
    // Retrieve "id" from ccData response
    const ccResponse = await axios_1.default.post(ccEndpoint, ccData, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    // Use "id" to send back to 
    const response = await axios_1.default.post(locationEndpoint, qs_1.default.stringify({
        '_method': 'patch',
        'complete': 1,
        's': ccResponse.data
    }), {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });
    return response.status;
};
const checkout = async () => {
    await postShippingInfo();
    //await postCCInfo();
    return 0;
};
// Main function
const main = async () => {
    const products = await getProducts(url);
    if (await addToCart(products[0].variantId, products[0].size) === 200)
        console.log(`Successfully added ${products[0].size}`);
    console.log(`Items in Cart: ${await getCart()}`);
    console.log(`Checkout Status: ${await checkout()}`);
};
main();
