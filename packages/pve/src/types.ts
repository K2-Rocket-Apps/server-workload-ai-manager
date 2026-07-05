export interface PveConfig {
  host: string;
  tokenId: string;
  tokenSecret: string;
  node?: string;
  insecure?: boolean;
}

export interface VmSummary {
  vmid: number;
  name: string;
  status: string;
  node: string;
  cpus?: number;
  maxmem?: number;
  maxdisk?: number;
  uptime?: number;
  cpu?: number;
  mem?: number;
  disk?: number;
}

export interface VmStatus extends VmSummary {
  pid?: number;
  qmpstatus?: string;
  lock?: string;
}

export interface NodeStatus {
  node: string;
  status: string;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  uptime: number;
  loadavg: number[];
}

export interface GuestExecResult {
  pid: number;
}

export interface GuestExecStatus {
  exited: boolean;
  exitcode?: number;
  outdata?: string;
  errdata?: string;
}

export interface HealthVmReport {
  vmid: number;
  name: string;
  status: string;
  node: string;
  guestAgentAlive: boolean;
  cpuPercent?: number;
  memPercent?: number;
  diskPercent?: number;
  issues: string[];
  ips?: string[];
}

export interface HealthReport {
  generatedAt: string;
  node: string;
  vms: HealthVmReport[];
  nodeStatus?: NodeStatus;
}
