use wasm_bindgen::prelude::*;
use base64::{engine::general_purpose, Engine as _};

/// Converts raw bytes to base64
///
/// JS will pass a Uint8Array
#[wasm_bindgen]
pub fn bytes_to_base64(bytes: &[u8]) -> String {
    general_purpose::STANDARD.encode(bytes)
}
