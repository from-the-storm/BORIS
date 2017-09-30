from channels.routing import route

from boris.registration import consumers as registration_consumers

channel_routing = [
    #route("http.request", registration_consumers.http_consumer),
    route("websocket.receive", registration_consumers.ws_message),
]
