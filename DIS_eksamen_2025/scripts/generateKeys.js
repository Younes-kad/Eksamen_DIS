const { generateKeyPairSync } = require("crypto");

function printKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  const publicKeyPem = publicKey.export({ type: "pkcs1", format: "pem" });
  const privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" });

  console.log("==== PUBLIC KEY ====");
  console.log(publicKeyPem);
  console.log("==== PRIVATE KEY ====");
  console.log(privateKeyPem);
}

printKeyPair();
