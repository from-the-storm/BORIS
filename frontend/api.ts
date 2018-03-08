import { ApiErrorResponse, ApiMethod } from '../backend/routes/api-interfaces';

/**
 * Call a BORIS API method
 * @param method The API method to call
 * @param data Data to pass to the API, if any
 */
export async function callApi<RequestType, ResponseType>(method: ApiMethod<RequestType, ResponseType>, data: RequestType): Promise<ResponseType> {
    let response: Response;
    if (method.type === 'POST') {
        response = await fetch(method.path, {
            method: 'post',
            credentials: 'include',
            headers: new Headers({"Content-Type": "application/json"}),
            body: JSON.stringify(data),
        });
    } else if (method.type === 'GET') {
        const paramsStr = Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent((data as any)[k])).join('&');
        response = await fetch(method.path + (paramsStr ? `?${paramsStr}` : ''), {
            method: 'get',
            credentials: 'include',
        });
    }
    if (response.ok) {
        const data: ResponseType = await response.json();
        return data;
    } else {
        const data: ApiErrorResponse = await response.json();
        throw new Error(data.error);
    }
}
