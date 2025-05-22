import type { ProfileContent } from "applesauce-core/helpers";

export type Bridge = {
  irc: {
    /** IRC server to connect to */
    server: string;
    /** IRC port to connect to */
    port: number;
    /** Whether to use TLS */
    secure: boolean;
    /** IRC nick to use */
    nick: string;
    /** IRC channel to join */
    channel: string;
  };
  nostr: {
    /** Private key to use */
    nsec: string;
    /** Relay to publish to */
    relay: string;
    /** Channel name without the # */
    channel: string;
    /** nostr profile */
    profile?: ProfileContent;
  };
};

const config: Bridge[] = [
  {
    irc: {
      server: "irc.example.com",
      port: 6697,
      secure: true,
      nick: "nostr-bridge",
      channel: "#example-channel",
    },
    nostr: {
      nsec: "nsec1e20zg....",
      relay: "wss://relay.example.com",
      channel: "example-channel",
      profile: {
        name: "irc-bridge",
        display_name: "IRC Bridge",
      },
    },
  },
];

export default config;
