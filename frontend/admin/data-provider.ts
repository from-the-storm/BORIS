import {
    GET_LIST,
    GET_ONE,
    GET_MANY,
    GET_MANY_REFERENCE,
    CREATE,
    UPDATE,
    DELETE,
} from 'react-admin';
import { makeQueryString } from '../api';

const API_URL = '/api/admin';

/**
 * @param {String} type One of the constants appearing at the top if this file, e.g. 'UPDATE'
 * @param {String} resource Name of the resource to fetch, e.g. 'posts'
 * @param {Object} params The Data Provider request params, depending on the type
 * @returns {Object} { url, options } The HTTP request parameters
 */
const convertDataProviderRequestToHTTP = (type: string, resource: string, params: any) => {
    switch (type) {
    case GET_LIST: {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const queryStr = makeQueryString({
            sort: JSON.stringify([field, order]),
            page,
            perPage,
            filter: JSON.stringify(params.filter),
        });
        return { url: `${API_URL}/${resource}${queryStr}` };
    }
    case GET_ONE:
        return { url: `${API_URL}/${resource}/${params.id}` };
    case GET_MANY: {
        // Hack: Our 'scripts' resources have a custom ID field.
        // https://marmelab.com/react-admin/FAQ.html#can-i-have-custom-identifiersprimary-keys-for-my-resources
        const idField = (resource === 'scripts') ? 'name' : 'id';
        const queryStr = makeQueryString({
            filter: JSON.stringify({ [idField]: params.ids }),
        });
        return { url: `${API_URL}/${resource}${queryStr}` };
    }
    case GET_MANY_REFERENCE: {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const queryStr = makeQueryString({
            sort: JSON.stringify([field, order]),
            range: JSON.stringify([(page - 1) * perPage, (page * perPage) - 1]),
            filter: JSON.stringify({ ...params.filter, [params.target]: params.id }),
        });
        return { url: `${API_URL}/${resource}${queryStr}` };
    }
    case UPDATE:
        return {
            url: `${API_URL}/${resource}/${params.id}`,
            options: { method: 'PUT', body: JSON.stringify(params.data), headers: new Headers({"Content-Type": "application/json"}) },
        };
    case CREATE:
        return {
            url: `${API_URL}/${resource}`,
            options: { method: 'POST', body: JSON.stringify(params.data), headers: new Headers({"Content-Type": "application/json"}) },
        };
    case DELETE:
        return {
            url: `${API_URL}/${resource}/${params.id}`,
            options: { method: 'DELETE' },
        };
    default:
        throw new Error(`Unsupported fetch action type ${type}`);
    }
};

/**
 * @param {Object} response HTTP response from fetch()
 * @param {String} type One of the constants appearing at the top if this file, e.g. 'UPDATE'
 * @param {String} resource Name of the resource to fetch, e.g. 'posts'
 * @param {Object} params The Data Provider request params, depending on the type
 * @returns {Object} Data Provider response
 */
async function convertHTTPResponseToDataProvider(response: Response, type: string, resource: string, params: any) {
    const json = await response.json();

    // Hack: Our 'scripts' resources have a custom ID field.
    // https://marmelab.com/react-admin/FAQ.html#can-i-have-custom-identifiersprimary-keys-for-my-resources
    if (resource === 'scripts') {
        if (Array.isArray(json.data)) {
            json.data.forEach((script: any) => { script.id = script.name; });
        } else {
            json.id = json.name;
        }
    }


    switch (type) {
    case GET_LIST:
    case GET_MANY:
        return {
            data: json.data,
            total: json.count,
        };
    case CREATE:
        return { data: { ...params.data, id: json.id } };
    default:
        return { data: json };
    }
};

/**
 * @param {string} type Request type, e.g GET_LIST
 * @param {string} resource Resource name, e.g. "posts"
 * @param {Object} payload Request parameters. Depends on the request type
 * @returns {Promise} the Promise for response
 */
export async function dataProvider(type: string, resource: string, params: any): Promise<any> {
    const { url, options } = convertDataProviderRequestToHTTP(type, resource, params);
    const response = await fetch(url, {
        credentials: 'include',
        ...options
    });
    if (!response.ok) {
        let jsonData: any;
        let error: any;
        try {
            jsonData = await response.json();
        } catch (error) {
            error = new Error("Unable to get a valid JSON response from the API.");
        }
        error = new Error(jsonData.error || "Unknown error");
        error.status = response.status;
        throw error;
    }
    return convertHTTPResponseToDataProvider(response, type, resource, params);
};
