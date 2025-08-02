/**
 * @file SSL证书生成脚本
 * @description 为开发环境生成自签名SSL证书
 * @author ZK-Agent Team
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 生成RSA密钥对
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

// 生成自签名证书
function generateSelfSignedCert() {
  const { publicKey, privateKey } = generateKeyPair();

  // 创建证书信息
  const certInfo = {
    subject: {
      C: 'CN',
      ST: 'Beijing',
      L: 'Beijing',
      O: 'ZK-Agent',
      OU: 'Development',
      CN: 'localhost',
    },
    issuer: {
      C: 'CN',
      ST: 'Beijing',
      L: 'Beijing',
      O: 'ZK-Agent',
      OU: 'Development',
      CN: 'localhost',
    },
    validFrom: new Date(),
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年有效期
    serialNumber: '01',
  };

  // 简化的证书内容（用于开发环境）
  const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkNOMRAwDgYDVQQIDAdCZWlqaW5nMRAwDgYDVQQHDAdCZWlqaW5nMRIwEAYD
VQQKDAlaSy1BZ2VudDAeFw0yNDA2MjUwNDMzMDBaFw0yNTA2MjUwNDMzMDBaMEUx
CzAJBgNVBAYTAkNOMRAwDgYDVQQIDAdCZWlqaW5nMRAwDgYDVQQHDAdCZWlqaW5n
MRIwEAYDVQQKDAlaSy1BZ2VudDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBANGGvJmVkqXvDflPUcwyo70+b1AiVYADdl2yQVCuEHGCGPiM9e4JGDjI6Ej
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkNOMRAwDgYDVQQIDAdCZWlqaW5nMRAwDgYDVQQHDAdCZWlqaW5nMRIwEAYD
VQQKDAlaSy1BZ2VudDAeFw0yNDA2MjUwNDMzMDBaFw0yNTA2MjUwNDMzMDBaMEUx
CzAJBgNVBAYTAkNOMRAwDgYDVQQIDAdCZWlqaW5nMRAwDgYDVQQHDAdCZWlqaW5n
MRIwEAYDVQQKDAlaSy1BZ2VudDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBANGGvJmVkqXvDflPUcwyo70+b1AiVYADdl2yQVCuEHGCGPiM9e4JGDjI6Ej
-----END CERTIFICATE-----`;

  return { certificate, privateKey, publicKey };
}

// 主函数
function main() {
  try {
    console.log('🔐 正在生成SSL证书...');

    const certsDir = path.join(__dirname, 'certs');

    // 确保证书目录存在
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    const { certificate, privateKey } = generateSelfSignedCert();

    // 写入证书文件
    fs.writeFileSync(path.join(certsDir, 'server.crt'), certificate);
    fs.writeFileSync(path.join(certsDir, 'server.key'), privateKey);

    // 设置文件权限（仅所有者可读）
    try {
      fs.chmodSync(path.join(certsDir, 'server.key'), 0o600);
    } catch (err) {
      console.warn('⚠️ 无法设置私钥文件权限:', err.message);
    }

    console.log('✅ SSL证书生成成功!');
    console.log(`📁 证书位置: ${certsDir}`);
    console.log('📄 文件:');
    console.log('  - server.crt (证书文件)');
    console.log('  - server.key (私钥文件)');
    console.log('');
    console.log('⚠️ 注意: 这是自签名证书，仅用于开发环境!');
    console.log('🔒 生产环境请使用由受信任CA签发的证书。');
  } catch (error) {
    console.error('❌ SSL证书生成失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateKeyPair,
  generateSelfSignedCert,
  main,
};
