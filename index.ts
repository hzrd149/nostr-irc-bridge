#!/usr/bin/env bun

// NOTE: this is built using rxjs because I want to see how far I can push it

import { EventStore } from "applesauce-core";
import { getDisplayName, unixNow } from "applesauce-core/helpers";
import { addressPointerLoader } from "applesauce-loaders";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import { decode, type ProfilePointer } from "nostr-tools/nip19";
import {
  combineLatest,
  concatMap,
  defer,
  EMPTY,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  retry,
  shareReplay,
  switchMap,
  tap,
} from "rxjs";

import config, { type Bridge } from "./config";
import { createIrcUri, ircClient, joinChannel, listenForMessages } from "./irc";
import { colors } from "irc";

const EPHEMERAL_CHAT_KIND = 23333;
const pool = new RelayPool();

const eventStore = new EventStore();
const addressLoader = addressPointerLoader(pool.request.bind(pool), {
  eventStore,
  lookupRelays: ["wss://purplepag.es"],
});

function nostrProfile(pointer: ProfilePointer) {
  if (eventStore.hasReplaceable(0, pointer.pubkey))
    return of(eventStore.getReplaceable(0, pointer.pubkey));

  // else load it from the relays
  return addressLoader({ kind: 0, ...pointer });
}

/** Create a bridge between IRC and Nostr */
function bridge(bridge: Bridge) {
  const { irc, nostr } = bridge;

  const key = decode(nostr.nsec).data;
  if (!(key instanceof Uint8Array)) throw new Error("Invalid nsec");
  const pubkey = getPublicKey(key);

  const relay = pool.relay(nostr.relay);

  const client = ircClient(irc.server, irc.nick, irc.secure, irc.port);
  const channel = client.pipe(
    switchMap((client) => joinChannel(client, irc.channel)),
    shareReplay(1),
  );

  const nostrToIrc = relay
    .req({ kinds: [EPHEMERAL_CHAT_KIND], "#d": [nostr.channel] })
    .pipe(
      onlyEvents(),
      // Ignore our own messages
      filter((event) => event.pubkey !== pubkey),
      // Keep retrying the connection to the relay
      retry({ count: Infinity, delay: 10_000 }),
      // Get the users profile along with the message
      mergeMap((event) =>
        combineLatest([
          of(event),
          nostrProfile({ pubkey: event.pubkey, relays: [nostr.relay] }),
          channel,
        ]),
      ),
      // Send message to IRC
      mergeMap(([event, profile, client]) => {
        console.log(`Forwarding message to IRC (event: ${event.id})`);
        client.say(
          irc.channel,
          `${colors.wrap("green", getDisplayName(profile, "anon"))}: ${event.content}`,
        );
        return EMPTY;
      }),
    );

  // Publish a profile to the relay when started
  const profile = nostr.profile
    ? defer(() =>
        from([
          {
            kind: 0,
            content: JSON.stringify(nostr.profile),
            created_at: unixNow(),
            tags: [],
          },
          {
            kind: EPHEMERAL_CHAT_KIND,
            content: "Starting IRC bridge",
            created_at: unixNow(),
            tags: [["d", nostr.channel]],
          },
        ]),
      ).pipe(
        map((d) => finalizeEvent(d, key)),
        switchMap((e) => relay.publish(e)),
        tap(() => {
          console.log("Published nostr profile");
        }),
      )
    : EMPTY;

  const ircToNostr = channel.pipe(
    // Tell nostr when IRC is connected
    tap(() => {
      console.log(`Joined ${irc.channel} on ${irc.server}`);
      relay
        .publish(
          finalizeEvent(
            {
              kind: EPHEMERAL_CHAT_KIND,
              content: `Stared bridge to ${createIrcUri(irc.server, irc.secure, irc.port, irc.channel)}`,
              created_at: unixNow(),
              tags: [["d", nostr.channel]],
            },
            key,
          ),
        )
        .subscribe();
    }),
    // Listen for messages
    switchMap((c) => listenForMessages(c, irc.channel)),
    // Ignore our own messages
    filter((message) => !message.from.startsWith(irc.nick)),
    // Log received message
    tap(() => console.log(`Message in ${irc.channel} on ${irc.server}`)),
    // Create nostr events for messages
    map((message) =>
      finalizeEvent(
        {
          kind: EPHEMERAL_CHAT_KIND,
          content: `${message.from}: ${message.message}`,
          created_at: unixNow(),
          tags: [["d", nostr.channel]],
        },
        key,
      ),
    ),
    // Publish to nostr
    concatMap((event) => relay.publish(event)),
  );

  // Start all observables
  return merge(profile, nostrToIrc, ircToNostr).pipe(ignoreElements());
}

const brdiges = merge(...config.map(bridge)).subscribe();

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  brdiges.unsubscribe();

  // Wait a second before closing
  setTimeout(() => process.exit(0), 5000);
});

console.log("IRC to Nostr bridge started");
