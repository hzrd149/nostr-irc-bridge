# nostr-irc-bridge

A bridge that connects IRC channels to Nostr [ephemeral chat](https://gist.github.com/ismyhc/e42abc83aa266e622bf253763d52dd6b), allowing messages to flow between both platforms.

## Features

- Bridge messages from IRC to Nostr and vice versa
- Configurable to connect multiple IRC channels to multiple Nostr relays
- Custom profiles for the bot on Nostr

## Requirements

- [Bun](https://bun.sh/) (JavaScript runtime)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nostr-irc-bridge.git
cd nostr-irc-bridge
```

2. Install dependencies:

```bash
bun install
```

## Configuration

Edit the `config.ts` file to configure your IRC channels and Nostr relays:

```typescript
const config: Bridge[] = [
  {
    irc: {
      server: "irc.example.com",
      port: 6697,
      secure: true,
      nick: "your-bot-nickname",
      channel: "#your-irc-channel",
    },
    nostr: {
      nsec: "your-nostr-private-key",
      relay: "wss://your-nostr-relay.com",
      channel: "your-nostr-channel-name",
      profile: {
        name: "irc-bridge",
        display_name: "IRC Bridge",
        about: "Bot bridging IRC and Nostr",
      },
    },
  },
  // You can add more bridges here
];
```

### Configuration Options

- **IRC Configuration**:

  - `server`: IRC server address
  - `port`: IRC server port
  - `secure`: Whether to use TLS (true/false)
  - `nick`: Nickname for the bot on IRC
  - `channel`: IRC channel to join (include the # prefix)

- **Nostr Configuration**:
  - `nsec`: Your bots private key
  - `relay`: Nostr relay WebSocket URL
  - `channel`: Nostr channel name (without # prefix)
  - `profile`: Nostr profile details for the bot

## Running the Bridge

Start the bridge with:

```bash
bun run index.ts
```

The bridge will connect to the configured IRC channels and Nostr relays, and start forwarding messages between them.

## Todo

- Handle converting nip-19 nostr mentions to IRC nicknames

## License

MIT
