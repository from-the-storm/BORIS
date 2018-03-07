import { ApiErrorResponse } from '../backend/routes/api-interfaces';

/**
 * POST some JSON data to the BORIS API
 * @param path The path to post to, e.g. '/auth/team/join'
 * @param data Data to post.
 */
export async function postToApi<RequestType, ResponseType>(path: string, data: RequestType): Promise<ResponseType> {
    const response = await fetch(path, {
        method: 'post',
        credentials: 'include',
        headers: new Headers({"Content-Type": "application/json"}),
        body: JSON.stringify(data),
    });
    if (response.ok) {
        const data: ResponseType = await response.json();
        return data;
    } else {
        const data: ApiErrorResponse = await response.json();
        throw new Error(data.error);
    }
}
