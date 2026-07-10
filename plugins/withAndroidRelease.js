const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SKIP_META = '-Xskip-metadata-version-check';

/**
 * Thêm cờ `-Xskip-metadata-version-check` vào mọi task Kotlin compile.
 * WHY: play-services-ads (từ react-native-google-mobile-ads) biên dịch bằng
 * Kotlin 2.3.0, còn toolchain RN 0.86 ghim compiler 2.1.0. Cờ này cho compiler
 * cũ đọc được metadata mới hơn. Đặt trong `allprojects` của android/build.gradle.
 */
function withKotlinSkipMetadata(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withAndroidRelease: build.gradle không phải Groovy.');
    }
    if (cfg.modResults.contents.includes(SKIP_META)) return cfg;

    const marker = 'allprojects {';
    if (!cfg.modResults.contents.includes(marker)) {
      throw new Error('withAndroidRelease: không tìm thấy "allprojects {" trong build.gradle.');
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      marker,
      `${marker}
  // Injected by plugins/withAndroidRelease.js — xem lý do trong file plugin.
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      freeCompilerArgs += ['${SKIP_META}']
    }
  }`
    );
    return cfg;
  });
}

/**
 * Cấu hình ký release bằng upload keystore (đọc từ các property MYAPP_UPLOAD_*).
 * Thêm signingConfigs.release và trỏ buildTypes.release sang đó.
 */
function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;

    if (!c.includes('signingConfigs.release')) {
      // Chèn block release ngay sau signingConfig debug.
      const debugClose = "keyPassword 'android'\n        }";
      if (!c.includes(debugClose)) {
        throw new Error('withAndroidRelease: không tìm thấy signingConfigs.debug để chèn release.');
      }
      c = c.replace(
        debugClose,
        `${debugClose}
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`
      );

      // Đổi buildTypes.release để dùng release signing khi có keystore, ngược lại fallback debug.
      // Neo vào comment mặc định của template (chỉ xuất hiện trong buildTypes.release).
      const releaseAnchor =
        '// see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug';
      if (!c.includes(releaseAnchor)) {
        throw new Error('withAndroidRelease: không tìm thấy buildTypes.release mặc định.');
      }
      c = c.replace(
        releaseAnchor,
        `// see https://reactnative.dev/docs/signed-apk-android.
            signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
      );

      cfg.modResults.contents = c;
    }
    return cfg;
  });
}

/**
 * Ghi các property MYAPP_UPLOAD_* vào android/gradle.properties.
 * Password đọc từ credentials/keystore-password.txt (không commit, không hardcode).
 * Nếu thiếu keystore/password thì bỏ qua → release fallback debug (build dev vẫn chạy).
 */
function withUploadSigningProps(config) {
  return withGradleProperties(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const keystore = path.join(projectRoot, 'credentials', 'upload-keystore.jks');
    const pwFile = path.join(projectRoot, 'credentials', 'keystore-password.txt');

    if (!fs.existsSync(keystore) || !fs.existsSync(pwFile)) {
      console.warn(
        'withAndroidRelease: thiếu credentials/upload-keystore.jks hoặc keystore-password.txt — bỏ qua signing, release sẽ ký bằng debug key.'
      );
      return cfg;
    }
    const password = fs.readFileSync(pwFile, 'utf8').trim();

    const props = {
      MYAPP_UPLOAD_STORE_FILE: '../../credentials/upload-keystore.jks',
      MYAPP_UPLOAD_KEY_ALIAS: 'upload',
      MYAPP_UPLOAD_STORE_PASSWORD: password,
      MYAPP_UPLOAD_KEY_PASSWORD: password,
    };

    for (const [key, value] of Object.entries(props)) {
      const existing = cfg.modResults.find((i) => i.type === 'property' && i.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
}

/** Gộp 3 mod: Kotlin skip-metadata + release signingConfig + signing props. */
module.exports = function withAndroidRelease(config) {
  config = withKotlinSkipMetadata(config);
  config = withReleaseSigning(config);
  config = withUploadSigningProps(config);
  return config;
};
