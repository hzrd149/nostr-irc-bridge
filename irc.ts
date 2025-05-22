import { Client } from "irc";
import { Observable } from "rxjs";

const clients = new Map<string, Observable<Client>>();

export function createIrcUri(
  server: string,
  secure: boolean,
  port: number,
  channel?: string,
) {
  return `${secure ? "ircs" : "irc"}://${server}:${port}${channel ? `/${channel}` : ""}`;
}

/** Create a IRC client connection */
export function ircClient(
  server: string,
  nick: string,
  secure: boolean,
  port: number,
) {
  const key = `${server}:${nick}:${secure}:${port}`;
  if (clients.has(key)) return clients.get(key)!;

  const observable = new Observable<Client>((observer) => {
    const client = new Client(server, nick, { secure, port });

    client.connect(10, () => {
      observer.next(client);
    });

    return () => client.disconnect("Bridge shutting down", () => {});
  });

  clients.set(key, observable);

  return observable;
}

/** Joins a channel with a client */
export function joinChannel(client: Client, channel: string, leave?: string) {
  return new Observable<Client>((observer) => {
    client.join(channel, () => observer.next(client));

    return () =>
      client.part(channel, leave ?? "Bridge shutting down", () => {});
  });
}

/** Listen for messages in an IRC channel */
export function listenForMessages(client: Client, channel: string) {
  return new Observable<{ from: string; message: string }>((observer) => {
    const listener = (from: string, message: string) =>
      observer.next({ from, message });
    client.addListener("message" + channel, listener);
    return () => client.removeListener("message" + channel, listener);
  });
}
