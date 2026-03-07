use enigo::{Enigo, Key, Keyboard, Mouse};
use std::sync::Mutex;
use tauri::State;

pub struct InputState {
    pub enigo: Mutex<Enigo>,
}

impl InputState {
    pub fn new() -> Self {
        Self {
            enigo: Mutex::new(Enigo::new(&enigo::Settings::default()).unwrap()),
        }
    }
}

// Ensure Thread Safety across Tauri Invokes
unsafe impl Send for InputState {}
unsafe impl Sync for InputState {}

#[tauri::command]
pub async fn simulate_input(
    state: State<'_, InputState>,
    event_type: String,
    key: Option<String>,
    x: Option<i32>,
    y: Option<i32>,
    button: Option<String>,
) -> Result<(), String> {
    let mut enigo = state.enigo.lock().map_err(|e| e.to_string())?;

    match event_type.as_str() {
        "mousemove" => {
            if let (Some(px), Some(py)) = (x, y) {
                enigo.move_mouse(px, py, enigo::Coordinate::Abs).map_err(|e| e.to_string())?;
            }
        }
        "mousedown" => {
            let btn = match button.as_deref() {
                Some("right") => enigo::Button::Right,
                Some("middle") => enigo::Button::Middle,
                _ => enigo::Button::Left,
            };
            enigo.button(btn, enigo::Direction::Press).map_err(|e| e.to_string())?;
        }
        "mouseup" => {
            let btn = match button.as_deref() {
                Some("right") => enigo::Button::Right,
                Some("middle") => enigo::Button::Middle,
                _ => enigo::Button::Left,
            };
            enigo.button(btn, enigo::Direction::Release).map_err(|e| e.to_string())?;
        }
        "click" => {
             let btn = match button.as_deref() {
                Some("right") => enigo::Button::Right,
                Some("middle") => enigo::Button::Middle,
                _ => enigo::Button::Left,
            };
            enigo.button(btn, enigo::Direction::Click).map_err(|e| e.to_string())?;
        }
        "keydown" => {
            if let Some(k) = key {
                if k.len() == 1 {
                    enigo.key(Key::Unicode(k.chars().next().unwrap()), enigo::Direction::Press).map_err(|e| e.to_string())?;
                } else if let Some(special) = parse_key(&k) {
                    enigo.key(special, enigo::Direction::Press).map_err(|e| e.to_string())?;
                }
            }
        }
        "keyup" => {
            if let Some(k) = key {
                if k.len() == 1 {
                    enigo.key(Key::Unicode(k.chars().next().unwrap()), enigo::Direction::Release).map_err(|e| e.to_string())?;
                } else if let Some(special) = parse_key(&k) {
                    enigo.key(special, enigo::Direction::Release).map_err(|e| e.to_string())?;
                }
            }
        }
        _ => return Err(format!("Unknown event type: {}", event_type)),
    }

    Ok(())
}

fn parse_key(key: &str) -> Option<Key> {
    match key.to_lowercase().as_str() {
        "enter" | "return" => Some(Key::Return),
        "tab" => Some(Key::Tab),
        "space" | " " => Some(Key::Space),
        "backspace" => Some(Key::Backspace),
        "escape" | "esc" => Some(Key::Escape),
        "shift" => Some(Key::Shift),
        "control" | "ctrl" => Some(Key::Control),
        "alt" => Some(Key::Alt),
        "meta" | "os" | "super" | "command" => Some(Key::Meta),
        "arrowup" | "up" => Some(Key::UpArrow),
        "arrowdown" | "down" => Some(Key::DownArrow),
        "arrowleft" | "left" => Some(Key::LeftArrow),
        "arrowright" | "right" => Some(Key::RightArrow),
        "delete" => Some(Key::Delete),
        "home" => Some(Key::Home),
        "end" => Some(Key::End),
        "pageup" => Some(Key::PageUp),
        "pagedown" => Some(Key::PageDown),
        "capslock" => Some(Key::CapsLock),
        "f1" => Some(Key::F1),
        "f2" => Some(Key::F2),
        "f3" => Some(Key::F3),
        "f4" => Some(Key::F4),
        "f5" => Some(Key::F5),
        "f6" => Some(Key::F6),
        "f7" => Some(Key::F7),
        "f8" => Some(Key::F8),
        "f9" => Some(Key::F9),
        "f10" => Some(Key::F10),
        "f11" => Some(Key::F11),
        "f12" => Some(Key::F12),
        _ => None,
    }
}
