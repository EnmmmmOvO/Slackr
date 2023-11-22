import { BACKEND_URL } from './config.js'

/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 * 
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export const fileToDataUrl = (file) => {
    const validFileTypes = [ 'image/jpeg', 'image/png', 'image/jpg' ]
    const valid = validFileTypes.find(type => type === file.type);
    // Bad data, let's walk away.
    if (!valid) {
        throw Error('provided file is not a png, jpg or jpeg image.');
    }
    
    const reader = new FileReader();
    const dataUrlPromise = new Promise((resolve,reject) => {
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result);
    });
    reader.readAsDataURL(file);
    return dataUrlPromise;
}

// Regular expression for validating email addresses
export const emailRegExp = new RegExp(/^[a-zA-Z0-9.]+@[a-zA-Z0-9]+\.[a-zA-Z]+/);


// Function for making asynchronous HTTP requests to a backend server
export const fetchWithBackEnd = async (path, method, body, token) => {
    const response = async (resolve, reject) => {
        const option = {
            method: method,
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json"
            }
        };

        if (token) option.headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) option.body = JSON.stringify(body);

        try {
            const response = await fetch(BACKEND_URL + path, option);
            const responseData = await response.json();

            if (!response.ok)
                reject(responseData.error);
            else
                resolve(responseData);

        } catch (error) {
            reject(error.message);
        }
    }

    return new Promise(response);
}