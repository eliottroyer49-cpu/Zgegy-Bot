// bedrock-protocol force sa version compilée en C++ (raknet-native) dès qu'on
// l'importe normalement (`require('bedrock-protocol')`), même si on ne
// l'utilise pas — ce qui plante sur une machine sans compilateur C++/cmake.
//
// Heureusement, la lib embarque aussi une implémentation 100% JS (jsp-raknet).
// On importe directement les sous-modules internes pour construire notre
// propre "createClient" qui force ce backend JS, sans jamais toucher à la
// version native. C'est un copier-adapter fidèle de src/createClient.js
// de bedrock-protocol, juste avec le backend forcé.

const { Client } = require('bedrock-protocol/src/client');
const { RakClient } = require('bedrock-protocol/src/rak')('jsp-raknet');
const advertisement = require('bedrock-protocol/src/server/advertisement');
const Options = require('bedrock-protocol/src/options');
const { sleep } = require('bedrock-protocol/src/datatypes/util');

async function ping({ host, port }) {
  const con = new RakClient({ host, port });
  try {
    return advertisement.fromServerName(await con.ping());
  } finally {
    con.close();
  }
}

function connect(client) {
  client.connect();

  client.once('resource_packs_info', () => {
    client.write('resource_pack_client_response', {
      response_status: 'completed',
      resourcepackids: [],
    });

    client.once('resource_pack_stack', () => {
      client.write('resource_pack_client_response', {
        response_status: 'completed',
        resourcepackids: [],
      });
    });

    client.queue('client_cache_status', { enabled: false });

    if (client.versionLessThanOrEqualTo('1.20.80')) {
      client.queue('tick_sync', { request_time: BigInt(Date.now()), response_time: 0n });
    }

    sleep(500).then(() => client.queue('request_chunk_radius', { chunk_radius: client.viewDistance || 10 }));
  });

  if (client.versionLessThanOrEqualTo('1.20.80')) {
    let keepalive;
    client.tick = 0n;

    client.once('spawn', () => {
      keepalive = setInterval(() => {
        client.queue('tick_sync', { request_time: client.tick, response_time: 0n });
        client.tick += 10n;
      }, 500);

      client.on('tick_sync', (packet) => {
        client.tick = packet.response_time;
      });
    });

    client.once('close', () => clearInterval(keepalive));
  }
}

/**
 * Équivalent de bedrock.createClient(), mais 100% JS (aucune compilation native requise).
 */
function createJsClient(options) {
  const client = new Client({
    port: 19132,
    useNativeRaknet: false, // force le backend jsp-raknet (voir src/options.js de bedrock-protocol)
    ...options,
    delayedInit: true,
  });

  client.on('connect_allowed', () => connect(client));

  if (options.skipPing) {
    client.init();
  } else {
    ping(client.options)
      .then((ad) => {
        const adVersion = ad.version?.split('.').slice(0, 3).join('.');
        client.options.version = options.version ?? (Options.Versions[adVersion] ? adVersion : Options.CURRENT_VERSION);
        if (ad.portV4 && client.options.followPort) {
          client.options.port = ad.portV4;
        }
        client.init();
      })
      .catch((e) => client.emit('error', e));
  }

  return client;
}

module.exports = { createJsClient };
