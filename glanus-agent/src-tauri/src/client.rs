// HTTP Client for Glanus Backend Communication
use anyhow::{Result, Context};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Request/Response types matching Glanus backend API

#[derive(Debug, Serialize)]
pub struct RegisterRequest {
    #[serde(rename = "assetId")]
    pub asset_id: String,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    pub hostname: String,
    pub platform: String,
    #[serde(rename = "ipAddress")]
    pub ip_address: String,
    #[serde(rename = "agentVersion")]
    pub agent_version: String,
    #[serde(rename = "systemInfo")]
    pub system_info: SystemInfo,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub cpu: String,
    pub ram: u64, // GB
    pub disk: u64, // GB
}

#[derive(Debug, Deserialize)]
pub struct RegisterResponse {
    #[serde(rename = "authToken")]
    pub auth_token: String,
    pub agent: AgentData,
}

#[derive(Debug, Deserialize)]
pub struct AgentData {
    pub id: String,
    #[serde(rename = "assetId")]
    pub asset_id: String,
}

#[derive(Debug, Serialize)]
pub struct HeartbeatRequest {
    #[serde(rename = "authToken")]
    pub auth_token: String,
    pub metrics: HeartbeatMetrics,
}

#[derive(Debug, Serialize)]
pub struct HeartbeatMetrics {
    pub cpu: f32,
    pub ram: f32,
    pub disk: f32,
    #[serde(rename = "cpuTemp")]
    pub cpu_temp: Option<f32>,
    #[serde(rename = "ramUsed")]
    pub ram_used: f32,
    #[serde(rename = "ramTotal")]
    pub ram_total: f32,
    #[serde(rename = "diskUsed")]
    pub disk_used: f32,
    #[serde(rename = "diskTotal")]
    pub disk_total: f32,
    #[serde(rename = "networkUp")]
    pub network_up: f32,
    #[serde(rename = "networkDown")]
    pub network_down: f32,
    #[serde(rename = "topProcesses")]
    pub top_processes: String, // JSON string
}

#[derive(Debug, Deserialize)]
pub struct HeartbeatResponse {
    pub commands: Vec<Command>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Command {
    pub id: String,
    #[serde(rename = "scriptType")]
    pub script_type: String,
    pub script: String,
    pub timeout: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct CommandResultRequest {
    #[serde(rename = "authToken")]
    pub auth_token: String,
    #[serde(rename = "commandId")]
    pub command_id: String,
    pub status: String,
    pub output: Option<String>,
    pub error: Option<String>,
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
}

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, base_url }
    }

    /// Register agent with backend
    pub async fn register(&self, request: RegisterRequest, pre_auth_token: &str) -> Result<RegisterResponse> {
        let url = format!("{}/api/agent/register", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", pre_auth_token))
            .json(&request)
            .send()
            .await
            .context("Failed to send registration request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Registration failed with status {}: {}", status, error_text);
        }

        let result = response.json::<RegisterResponse>()
            .await
            .context("Failed to parse registration response")?;

        Ok(result)
    }

    /// Send heartbeat to backend
    pub async fn heartbeat(&self, request: HeartbeatRequest) -> Result<HeartbeatResponse> {
        let url = format!("{}/api/agent/heartbeat", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send heartbeat request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Heartbeat failed with status {}: {}", status, error_text);
        }

        let result = response.json::<HeartbeatResponse>()
            .await
            .context("Failed to parse heartbeat response")?;

        Ok(result)
    }

    /// Report command execution result
    pub async fn report_command_result(&self, request: CommandResultRequest) -> Result<()> {
        let url = format!("{}/api/agent/command-result", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send command result")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Command result reporting failed with status {}: {}", status, error_text);
        }

        Ok(())
    }
}

/// Get system hostname
pub fn get_hostname() -> String {
    hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Get platform string (WINDOWS, MACOS, LINUX)
pub fn get_platform() -> String {
    if cfg!(target_os = "windows") {
        "WINDOWS".to_string()
    } else if cfg!(target_os = "macos") {
        "MACOS".to_string()
    } else {
        "LINUX".to_string()
    }
}

/// Get local IP address (best effort)
pub fn get_local_ip() -> String {
    local_ip_address::local_ip()
        .ok()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string())
}
