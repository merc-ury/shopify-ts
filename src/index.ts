import Axios from 'axios';
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { IProductInfo } from './data/ProductInfo';

axiosCookieJarSupport(Axios); // adds support for cookieJar

const cookieJar = new CookieJar();
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36';

const url = 'https://www.jimmyjazz.com/collections/go-for-gold-by-nike/products/nike-shox-r4-104265-702';

const getProducts = async (uri: string): Promise<IProductInfo[]> => {
    const doc = await JSDOM.fromURL(uri);
    const products: IProductInfo[] = [];

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
                variantId: Number(value.getAttribute('value')!.trim())
            });
        }
    });

    return products;
};

const addToCart = async (variantId: number, size: string = ''): Promise<number> => {
    const endpoint = 'https://www.jimmyjazz.com/cart/add.js';

    const response = await Axios.post(endpoint, {
        form_type: 'product',
        utf8: '%E2%9C%93',
        Size: size,
        id: variantId
    }, 
    {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });

    return response.status;
};

const getCart = async (): Promise<number> => {
    const endpoint = 'https://www.jimmyjazz.com/cart.js';

    const response = await Axios.get(endpoint, {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });

    // TODO: generate interface for response 
    return response.data.item_count;
};

const checkout = async (): Promise<number> => {
    const endpoint = 'https://www.jimmyjazz.com/checkout.json';

    const response = await Axios.post(endpoint, null,
    {
        httpAgent: userAgent,
        jar: cookieJar,
        withCredentials: true
    });

    console.log(response.headers);

    return response.status;
};

// Main function (IIFE)
(async () => {
    const products = await getProducts(url);
    
    console.log(`Status Code: ${await addToCart(products[0].variantId, products[0].size)}`);
    console.log(`Items in Cart: ${await getCart()}`);
    await checkout();
})();

