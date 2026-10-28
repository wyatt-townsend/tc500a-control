# TC500A Thermostat — BACnet Integration Essentials

Condensed from *Honeywell TC500A BACnet Integration Guide*, doc `31-00478-06` Rev 01-25.
Stripped to what is needed to talk to the device over BACnet: link setup, object model,
point tables (name → object type + instance), enumerations, and protocol gotchas.

Omitted from the original: safety/regulatory notices, wiring and power-supply sizing,
terminal I/O configuration, application tuning (PID gains, fan speed maps, economizer
curves, service reminders, Delta-T commissioning).

---

## 1. Physical link

### BACnet MS/TP

| Terminal | Signal |
| --- | --- |
| `RS485 +` | BACnet MS/TP **A** |
| `RS485 -` | BACnet MS/TP **B** |

Setup on the thermostat HMI: **Config > Connection > BACnet MS/TP**.

1. Enable **BACnet MS/TP**, tap Save.
2. Enter a **Device ID** unique on the network.
3. **Auto-MAC addressing is on by default**; a MAC can also be set manually.
4. Baud rate auto-detects. The device probes for ~4 minutes after startup (or after
   MS/TP is enabled). If it cannot determine a rate — e.g. it is the only device on
   the segment — it falls back to **76800**. It can be set manually afterwards.

### BACnet/IP

Supported, but **not simultaneously with MS/TP**. Switching between IP and MS/TP
prompts and then reboots the thermostat.

IP settings are exposed as proprietary properties (see §9): UDP port (`1232`),
network number (`1233`), IPv4 address/mask/gateway (`1203`–`1205`), DHCP enable (`1206`).
DHCP works, but a router reservation is expected so the address stays stable.
The Wi-Fi MAC is shown on the HMI under **System Status > Network Status**.

### Time sync

`UTC_Offset` is a standard Device-object property, in minutes, range **-780 to +780**.
Zones west of the prime meridian are **positive**; east are negative. The value is
subtracted from the UTC in a `UTCTimeSynchronization` request to get local standard time.

Daylight saving cannot be read or written over BACnet — it must be set on the HMI.

---

## 2. Object model conventions

| Prefix | Meaning | Direction | Typical object type |
| --- | --- | --- | --- |
| `ni_` | Network input — you write to it | Writable | Analog/Binary/Multistate **Value** |
| `no_` | Network output — device status | Read-only | Analog/Binary/Multistate **Output** |
| `Cfg_` | Configuration | Writable | Analog/Binary/Multistate **Value** |
| `Alarm_UI_` | Raw alarm source point | Read-only | Analog/Binary **Input** |
| `AlarmPriority_` | Alarm severity | Read-only | Binary/Multistate **Output** |
| `Gui_` | HMI-internal | — | — |

Multistate objects are **1-based** (`present-value` 1 = first listed state). Binary and
Analog enumerations below are written as the raw values the device uses (usually
0-based) — read each table's Range column literally.

> **The prefix determines the object type, without exception.** `ni_` and `Cfg_` are
> always *Value* objects; `no_`, `Alarm_` and `AlarmPriority_` are always *Input*/*Output*
> objects. Where a point table below disagrees with this rule, the rule is right — see
> §11. A `no_` point read as a *Value* object will silently hit an unrelated `Cfg_`
> object at the same instance number rather than failing.

> **`no_` points are display only.** Writing to them has no effect on control logic.

---

## 3. Protocol behavior and known limitations

These materially affect a client implementation.

| Area | Behavior |
| --- | --- |
| **COV** | **Not supported.** `COV_Increment` properties are exposed on objects anyway — ignore them. Poll instead. |
| **Intrinsic alarming** | **Not supported.** Intrinsic-alarm properties are exposed but must not be configured. Do alarm detection client-side off the `Alarm_*` / `AlarmPriority_*` points. |
| **Device capabilities list** | The Device object advertises objects and services the device does **not** implement. Do not trust it; use the point tables here. |
| **PICS** | Claims Reference Input/Output objects that do not exist on the device. |
| **Priority array** | Priority arrays for AO / BO / MSO are **not synchronized** with actual values. |
| **Writing outputs** | A write to an AO / BO / MSO lands at **priority 16**, not the relinquish-default. |
| **UIO points** | If a UIO terminal is configured as binary in/out, its value still surfaces in the **Analog** Input/Output object, not the Binary one. |
| **`ni_` freshness** | Network inputs have fail-detect: if not rewritten within the configured update rate (default 300–900 s depending on point), the value falls back (§7). Clients should **rewrite `ni_` points periodically** — Honeywell recommends a max write interval of **1 minute**. |
| **Calendar object** | Not supported despite `Calendar1..10` existing. Holiday schedules must be set on the HMI. |
| **Schedule** | Only modes 0=Occupied, 1=Unoccupied, 3=Standby. Do not write `Effective_Period` or the schedule default output over BACnet. Special events are limited to a 3-year horizon and must not use floating date ranges — an unsupported range breaks schedule reads until it is deleted. |
| **Firmware download** | Not supported over the Niagara path (missing StartRestore/EndRestore). |

---

## 4. Minimum useful point set

The guide's "basic setup" list. Everything here reappears with fuller detail in §5–§8.

| Point | Object type | Instance | Access |
| --- | --- | --- | --- |
| `no_SpaceTemp` | Analog Output | 18 | R |
| `no_SpaceHumidity` | Analog Output | 19 | R |
| `no_SpaceCO2` | Analog Output | 20 | R |
| `no_CtrlSpaceTemp` | Analog Output | 67 | R |
| `no_DaTemp` | Analog Output | 13 | R |
| `no_DaHumidity` | Analog Output | 15 | R |
| `no_MaTemp` | Analog Output | 14 | R |
| `no_RaTemp` | Analog Output | 57 | R |
| `OaTemp_Display` | Analog Output | 75 | R |
| `OaHum_Display` | Analog Output | 76 | R |
| `no_EffSp` | Analog Output | 5 | R |
| `no_EffHeatSp` | Analog Output | 3 | R |
| `no_EffCoolSp` | Analog Output | 4 | R |
| `no_EffTempMode` | Multistate Output | 6 | R |
| `no_EffOccState` | Multistate Output | 20 | R |
| `no_BypassState` | Binary Output | 1 | R |
| `no_FanStart` | Binary Output | 19 | R |
| `no_ActiveHeatStages` | Analog Output | 7 | R |
| `no_ActiveCoolStages` | Analog Output | 11 | R |
| `no_ActiveAuxHeatStages` | Analog Output | 8 | R |
| `no_ActiveCompHeatStages` | Analog Output | 10 | R |
| `no_HeatCtrlOut` | Analog Output | 9 | R |
| `no_ReversingVlv` | Binary Output | 16 | R |
| `no_OaDmprPos` | Analog Output | 70 | R |
| `no_EconEn` | Binary Output | 22 | R |
| `no_HumActive` | Binary Output | 9 | R |
| `no_DehumActive` | Binary Output | 8 | R |
| `no_DO1` … `no_DO8` | Binary Output | 74–81 | R |
| `ni_ApplicationMode` | Multistate Value | 3 | W |
| `ni_NetSchCurrentState` | Multistate Value | 1 | W |
| `ni_NetSchNextState` | Multistate Value | 2 | W |
| `ni_NetTUNCOS` | Analog Value | 1 | W |
| `Cfg_Setpoints_OccCoolSp` | Analog Value | 4 | W |
| `Cfg_Setpoints_StbyCoolSp` | Analog Value | 5 | W |
| `Cfg_Setpoints_UnOccCoolSp` | Analog Value | 6 | W |
| `Cfg_Setpoints_OccHeatSp` | Analog Value | 7 | W |
| `Cfg_Setpoints_StbyHeatSp` | Analog Value | 8 | W |
| `Cfg_Setpoints_UnOccHeatSp` | Analog Value | 9 | W |

> The source table marks the `ni_` rows "Read Only". That contradicts Chapter 6, which
> states all network inputs are writable. Treat `ni_` as writable.

---

## 5. Network inputs (writable) — `ni_`

### Occupancy, schedule and mode

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `ni_NetSchCurrentState` | Multistate Value | 1 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=No Override | 5 |
| `ni_NetSchNextState` | Multistate Value | 2 | same as above | 5 |
| `ni_NetTUNCOS` | Analog Value | 1 | minutes to next change of state | — |
| `ni_ApplicationMode` | Multistate Value | 3 | 1=Auto, 2=Heat, 3=Cool, 4=Emergency Heat, 5=Fan Only, 6=Off | 1 |
| `ni_OccManCom` | Multistate Value | 4 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=No Override | 5 |
| `ni_OccupancySensorState` | Multistate Value | 6 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=No Override | 5 |
| `ni_OccupancySensor` | Binary Value | 158 | 0=Unoccupied, 1=Occupied | Null |
| `ni_BypassState` | Binary Value | 1 | 0=Disable, 1=Enable bypass timer | 0 |
| `ni_BypassValue` | Analog Value | 2 | ≥ 0 (bypass time) | 0 |

`ni_ApplicationMode` is **not persisted across a power cycle**.

### Safety / override

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `ni_EmergencyHVACOverride` | Multistate Value | 5 | 1=Normal, 2=Pressurize, 3=Depressurize, 4=Purge, 5=Shutdown | 1 |
| `ni_ShutdownState` | Binary Value | 4 | 0=Normal, 1=Shutdown | 0 |
| `ni_SmokeMonitorstate` | Binary Value | 5 | 0=Normal, 1=Smoke | 0 |
| `ni_DemandLimitControlEn` | Binary Value | 2 | 0=Normal, 1=DLC Enable | 0 |
| `ni_DROptOut` | Binary Value | 256 | 0=Normal, 1=OptOut (opt out of active DR event) | 0 |
| `ni_DeviceLock` | Analog Value | 195 | 0=Idle, 1=GUI, 2=Network — locks HMI changes | 0 |

If `ni_EmergencyHVACOverride` is not mapped it defaults to Normal.

### Shared sensor values

Written from a supervisor when the thermostat should use a remote sensor.
Fail-detect applies (§7).

| Point | Type | Inst | Range |
| --- | --- | --- | --- |
| `ni_SpaceTemp` | Analog Value | 104 | -40 to 200 °F (-40 to 93 °C) |
| `ni_SpaceRH` | Analog Value | 80 | 0–100 %RH |
| `ni_SpaceCO2` | Analog Value | 81 | 0–2000 ppm |
| `ni_OutdoorTemp` | Analog Value | 89 | -40 to 150 °F (-40 to 65.5 °C) |
| `ni_OutdoorHum` | Analog Value | 194 | 0–100 %RH |
| `ni_OutdoorEnthalpy` | Analog Value | 339 | 0–100 BTU/lb |
| `ni_OutdoorDewpoint` | Analog Value | 340 | 0–100 °F |
| `ni_RaEnthalpy` | Analog Value | 341 | 0–100 BTU/lb |
| `ni_RaDewpoint` | Analog Value | 342 | 0–100 °F (-17.5 to 37.5 °C) |
| `ni_WSHPEnableState` | Binary Value | 25 | 0=Disable, 1=Enable |
| `ni_WSHPEnableValue` | Analog Value | 88 | ≥ 0 (water flow available) |

### Service / commissioning mode

`ni_ServiceModeEn` must be enabled for the rest of this group to take effect.

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `ni_ServiceModeEn` | Binary Value | 6 | 0=No Override, 1=Service | 0 |
| `ni_ServiceFan` | Multistate Value | 23 | 1=Off, 2=On (Hi), 3=Low, 4=Medium | 1 |
| `ni_ServiceFanSpeed` | Analog Value | 85 | 0–100 % | 0 |
| `ni_ServiceCompStage1` | Binary Value | 16 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceCompStage2` | Binary Value | 17 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceCompStage3` | Binary Value | 18 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceCoolStage4` | Binary Value | 463 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceHeatStage1` | Binary Value | 19 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceHeatStage2` | Binary Value | 20 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceHeatStage3` | Binary Value | 21 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceHeatCtrl` | Analog Value | 86 | 0–100 % (modulating heat) | 0 |
| `ni_ServiceCoolCtrl` | Analog Value | 1152 | 0–100 % (modulating cool) | 0 |
| `ni_ServiceRevVlvCmd` | Binary Value | 22 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceSimpleDehCmd` | Binary Value | 23 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceSimpleHumCmd` | Binary Value | 24 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceEconomizerCmd` | Binary Value | 141 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceOccStatusCmd` | Binary Value | 140 | 0=UnOcc, 1=Occ | 0 |
| `ni_ServiceOaDmprCtrl` | Analog Value | 212 | 0–100 % | 0 |
| `ni_ServiceExhaustFan1Cmd` | Binary Value | 390 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceExhaustFan2Cmd` | Binary Value | 391 | 0=Cmd Off, 1=Cmd On | 0 |
| `ni_ServiceCO2OutputCmd` | Binary Value | 220 | 0=0-10 Vdc, 1=2-10 Vdc | 1 |
| `ni_ServicePurgeOutputCmdDO` | Binary Value | 221 | 0=0-10 Vdc, 1=2-10 Vdc | 1 |
| `ni_ServicePurgeOP2-10V` | Analog Value | 859 | 0–100 % | 0 |
| `ni_SylkBus11Cmd` | Analog Value | 338 | 0–100 % (OA damper, shared value) | 0 |

### Diagnostics

| Point | Type | Inst | Range |
| --- | --- | --- | --- |
| `ni_mstpClearErr` | Binary Value | 174 | 0=False, 1=True — clears `no_mstpHeaderCrcError` / `no_mstpDataCrcErr` |

### Sylk sensor proxy inputs

All Analog Value, writable, default `nan`. Override a Sylk sensor reading from the network.

| Point | Inst | Point | Inst |
| --- | --- | --- | --- |
| `ni_SylkAddr2Temp` | 238 | `ni_SylkAddr6Hum` | 245 |
| `ni_SylkAddr2Hum` | 239 | `ni_SylkAddr9Temp` | 248 |
| `ni_SylkAddr2CO2` | 240 | `ni_SylkAddr9Hum` | 249 |
| `ni_SylkAddr3Temp` | 241 | `ni_SylkAddr10Temp` | 250 |
| `ni_SylkAddr4Temp` | 242 | `ni_SylkAddr10Hum` | 251 |
| `ni_SylkAddr5Temp` | 243 | `ni_SylkAddr12Temp` | 246 |
| `ni_SylkAddr6Temp` | 244 | `ni_SylkAddr12Hum` | 772 |

To override outdoor-air Sylk values, use `ni_OutdoorTemp` (AV 89) and `ni_OutdoorHum` (AV 194) instead.

---

## 6. Network outputs (read-only) — `no_`

### Occupancy and mode status

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `no_LocalOccSensState` | Multistate Output | 1 | 1=Occupied, 2=Unoccupied, 3=Unused | 3 |
| `no_EffOccSensState` | Multistate Output | 2 | 1=Occupied, 2=Unoccupied, 3=Unused | 3 |
| `no_EffOccState` | Multistate Output | 20 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=Null | 5 |
| `no_ManualOverride` | Multistate Output | 4 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=Null | 5 |
| `no_OccupancyState` | Binary Output | 3 | 0=Unoccupied, 1=Occupied | 0 |
| `no_BypassState` | Binary Output | 1 | 0=No Bypass, 1=Bypass | 0 |
| `no_BypassValue` | Analog Output | 1 | 0–100 (0=No Bypass, 100=Bypass) | Null |
| `no_BypassRemTime` | Analog Output | 65 | 1080–0 min remaining | 1080 |
| `no_EffSchCurrentState` | Multistate Output | 18 | 1=Occupied, 2=Unoccupied, 3=Bypass, 4=Standby, 5=No Override | 5 |
| `no_EffSchNextState` | Multistate Output | 19 | same as above | 5 |
| `no_EffTUNCOS` | Analog Output | 62 | 0–11520 min to next event | 0 |
| `no_EffLocalSch` | Analog Output | 77 | 0=Occupied, 1=Unoccupied, 3=Standby | Null |
| `no_SetpointSts` | Multistate Output | 7 | 1=Occupied, 2=Unoccupied, 3=Temporary, 4=Standby | 1 |
| `no_ApplicationCommandMode` | Multistate Output | 8 | 1=StartupWait, 2=Heat, 3=Cool, 4=Off, 5=EmgHt, 6=SmkEmg, 7=Freeze Protect, 8=Service Mode, 9=FanOnly | 4 |
| `no_EffTempMode` | Multistate Output | 6 | 1=Cool, 2=Reheat, 3=Heat, 4=Emergency Heat, 5=Off | 5 |
| `no_SmokeMode` | Multistate Output | 5 | 1=No Override, 2=Shutdown, 3=Pressurize, 4=Depressurize | 1 |
| `no_SystemDisable` | Binary Output | 4 | 0=Normal, 1=Disable | 0 |
| `no_ServiceMd` | Binary Output | 5 | 0=Disable, 1=Enable | 0 |
| `no_RecoveryStatus` | Binary Output | 82 | 0=Normal, 1=Recovery | 0 |

`no_SetpointSts` shows `Temporary` while a user setpoint adjustment is in effect;
otherwise it reflects the current system state until the next scheduled event or override timeout.

### Effective setpoints

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `no_EffHeatSp` | Analog Output | 3 | 40–120 °F (4.5–48.5 °C) | Null |
| `no_EffCoolSp` | Analog Output | 4 | 40–120 °F (4.5–48.5 °C) | Null |
| `no_EffSp` | Analog Output | 5 | 40–120 °F (4.5–48.5 °C) | Null |
| `no_EffAuxHeatSetpoint` | Analog Output | 6 | 40–120 °F (4.5–48.5 °C) | Null |
| `no_EffDATSp` | Analog Output | 253 | 40–150 °F (4.5–65.5 °C) | Null |
| `no_EffDlcShift` | Analog Output | 2 | 0–10 Δ°F (0–5.5 Δ°C) | Null |

### Sensor readings

| Point | Type | Inst | Range |
| --- | --- | --- | --- |
| `no_SpaceTemp` | Analog Output | 18 | -40 to 140 °F (-40 to 60 °C) |
| `no_SpaceHumidity` | Analog Output | 19 | 0–100 % |
| `no_SpaceCO2` | Analog Output | 20 | 0–2000 ppm |
| `no_CtrlSpaceTemp` | Analog Output | 67 | -40 to 140 °F — control space temp (test use only) |
| `no_DaTemp` | Analog Output | 13 | -40 to 200 °F (2 to 93 °C) |
| `no_DaHumidity` | Analog Output | 15 | 0–100 % |
| `no_MaTemp` | Analog Output | 14 | -40 to 150 °F (4.5 to 65.5 °C) |
| `no_RaTemp` | Analog Output | 57 | -40 to 150 °F (4.5 to 65.5 °C) |
| `no_OaTemp` | Analog Output | 16 | -40 to 150 °F (-40 to 65.5 °C) |
| `no_OaHumidity` | Analog Output | 17 | 0–100 % |
| `no_VOCLevel` | Analog Output | 66 | — |
| `no_CompDATemp` | Analog Output | 73 | -22 to 230 °F (-30 to 110 °C) |
| `no_CompCurSens` | Analog Output | 71 | 0–100 A |
| `no_FanCurSens` | Analog Output | 72 | 0–100 A |
| `no_OccupancySensor` | Binary Output | 94 | 0=Unoccupied, 1=Occupied |
| `no_ShutdownState` | Binary Output | 95 | 0=NoOvrd, 1=Shutdown |
| `no_WSHPEnableState` | Binary Output | 96 | 0=Disable, 1=Enable |
| `no_WSHPEnableValue` | Analog Output | 97 | 0–100 |

For displayed outdoor conditions (local sensor with Internet fallback) use
`OaTemp_Display` (AO 75) / `OaHum_Display` (AO 76) — display only, not for calculation.

### Heating / cooling / fan commands

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `no_IsHeatDisable` | Binary Output | 10 | 0=Enable, 1=Disable | 0 |
| `no_IsAuxHeatDisable` | Binary Output | 11 | 0=Enable, 1=Disable | 0 |
| `no_IsCompHeatDisable` | Binary Output | 12 | 0=Enable, 1=Disable | 0 |
| `no_IsCoolDisable` | Binary Output | 15 | 0=Enable, 1=Disable | 0 |
| `no_IsFanOnly` | Binary Output | 7 | 0=Normal, 1=Fan Only | 0 |
| `no_ActiveHeatStages` | Analog Output | 7 | 0–3 stages | 0 |
| `no_ActiveAuxHeatStages` | Analog Output | 8 | 0–2 stages | 0 |
| `no_ActiveCompHeatStages` | Analog Output | 10 | 0–3 stages | 0 |
| `no_ActiveCoolStages` | Analog Output | 11 | 0–3 stages | 0 |
| `no_HeatCtrlOut` | Analog Output | 9 | 0–100 % modulating heat | 0 |
| `no_CoolCtrlOut` | Analog Output | 131 | 0–100 % modulating cool | 0 |
| `no_ReversingVlv` | Binary Output | 16 | 0=Close, 1=Open | 0 |
| `no_DehumActive` | Binary Output | 8 | 0=Inactive, 1=Active | 0 |
| `no_HumActive` | Binary Output | 9 | 0=Inactive, 1=Active | 0 |
| `no_FanStart` | Binary Output | 19 | 0=Off, 1=On | 0 |
| `no_FanSpd` | Analog Output | 12 | 0–100 % | 0 |
| `no_FanHiSpd` | Binary Output | 20 | 0=Off, 1=On | 0 |
| `no_FanMedSpd` | Binary Output | 507 | 0=Off, 1=On | 0 |
| `no_FanLoSpd` | Binary Output | 21 | 0=Off, 1=On | 0 |
| `no_ExhaustFan1Status` | Binary Output | 501 | 0=Off, 1=On | 0 |
| `no_ExhaustFan2Status` | Binary Output | 502 | 0=Off, 1=On | 0 |
| `no_HWValveStatus` | Binary Output | 505 | 0=Off, 1=On (FCU hot water valve) | 0 |
| `no_CWValveStatus` | Binary Output | 506 | 0=Off, 1=On (FCU chilled water valve) | 0 |
| `no_DaHilimit` | Binary Output | 13 | 0=Normal, 1=HiLimit | 0 |
| `no_CompDaHilimit` | Binary Output | 14 | 0=Normal, 1=HiLimit | 0 |
| `no_CompDaLolimit` | Binary Output | 17 | 0=Normal, 1=LoLimit | 0 |
| `no_HeatOATLockout` | Multistate Output | 216 | 1=None, 2=HeatLockout, 3=CompressorLockout, 4=AuxiliaryHeatLockout | 1 |
| `no_CoolOATLockout` | Binary Output | 508 | 0=Inactive, 1=Active | 0 |

### Terminal load

| Point | Type | Inst | Range |
| --- | --- | --- | --- |
| `no_ConvHeatTermLdOut` | Analog Output | 59 | 0 to -160 % |
| `no_AuxHeatTermLdOut` | Analog Output | 60 | 0 to -160 % |
| `no_CompTermLdOut` | Analog Output | 61 | 0 to 160 % |
| `no_TermLdOut` | Analog Output | 85 | -200 to +200 % (combined heat/cool demand) |

### Economizer, damper, ventilation

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `no_EconEn` | Binary Output | 22 | 0=Disable, 1=Enable | 0 |
| `no_EconDmprMinCmd` | Binary Output | 18 | 0=Disable, 1=Enable | 0 |
| `no_OaDmprPos` | Analog Output | 70 | 0–100 % | Null |
| `no_ModEconEn` | Binary Output | 83 | 0=Enabled, 1=Disabled | nan |
| `no_ModEconValue` | Analog Output | 68 | 0–100 (0=Econ disabled, 100=enabled) | Null |
| `no_ModEconStatus` | Multistate Output | 185 | 1=Inactive, 2=Active, 3=OATUnAvail, 4=OAHUnAvail, 5=RATUnAvail, 6=RAHUnAvail, 7=MATUnAvail | 1 |
| `no_DCVEn` | Binary Output | 84 | 0=Enabled, 1=Disabled | Null |
| `no_DCVValue` | Analog Output | 69 | 0–100 (0=DCV disabled, 100=enabled) | Null |
| `no_MaLoLimActive` | Binary Output | 85 | 0=Inactive, 1=Active | 0 |
| `no_IsFreeCoolAvailable` | Binary Output | 86 | 0=Not Available, 1=Available | 0 |
| `no_IsEconomizing` | Binary Output | 87 | 0=False, 1=True | 0 |
| `no_PurgeState` | Binary Output | 98 | 0=Disable, 1=Enable | Null |
| `no_PckEconFault` | Binary Output | 128 | 0=Ok, 1=Faulty (external economizer) | 0 |

`no_ModEconEn`, `no_ModEconValue`, `no_DCVEn` are display only — do not use in calculations.

### Runtime accumulators

All Analog Output, range 0–270737 hours, default 0.

| Point | Inst | Point | Inst |
| --- | --- | --- | --- |
| `no_Fan_RunTimeAccumulate` | 22 | `no_CompStg1_RunTimeAccumulate` | 31 |
| `no_HeatStg1_RunTimeAccumulate` | 27 | `no_CompStg2_RunTimeAccumulate` | 32 |
| `no_HeatStg2_RunTimeAccumulate` | 28 | `no_CompStg3_RunTimeAccumulate` | 58 |
| `no_HeatStg3_RunTimeAccumulate` | 29 | `no_CoolStg4_RunTimeAccumulate` | 252 |
| `no_HeatCtrl_RunTimeAccumulate` | 30 | `no_CoolCtrl_RunTimeAccumulate` | 132 |

### Sylk actuator feedback

| Point | Type | Inst | Range |
| --- | --- | --- | --- |
| `no_Sylk11Pos` | Analog Output | 81 | 0–100 % position feedback |
| `no_Sylk11Cycles` | Analog Output | 82 | open→close cycle count |
| `no_Sylk11PowerReport` | Analog Output | 84 | 0–100 % (display only) |
| `no_Sylk11Status` | Binary Output | 117 | 0=OK, 1=Faulty (detail: 2=OverV, 3=UnderV, 4=Stall, 5=UnderV+Stall, 6=OverV+Stall) |
| `no_Sylk11Overriden` | Binary Output | 118 | 0=False, 1=Override (display only) |
| `no_Sylk11CalibrStatus` | Multistate Output | 112 | 1=UnCalibrated, 2=CalibrIsInProgress, 3=Calibrated |
| `no_Sylk11CalibrMax` | Analog Output | 87 | 0–100 % max position after calibration |
| `no_Sylk11CalibrMin` | Analog Output | 88 | 0–100 % min position after calibration |

### Delta-T diagnostics

All `no_DeltaT*Alarm` points are Multistate Output with the enumeration:
`1=Green, 2=Orange, 3=Red, 4=DisableByCtrlValue/MinDly, 5=SensorNotAvail,
6=DisableByEqAvail/HMIConfigServ, 7=DisableByMA/OALimits` (default 1).

| Point | Inst |
| --- | --- |
| `no_DeltaTConv/Aux/ModHtStg1Alarm` | 126 |
| `no_DeltaTConv/Aux/ModHtStg2Alarm` | 127 |
| `no_DeltaTConv/Aux/ModHtStg3Alarm` | 128 |
| `no_DeltaTCompHt/Cl/ConvClStg1Alarm` | 129 |
| `no_DeltaTCompHt/Cl/ConvClStg2Alarm` | 130 |
| `no_DeltaTCompHt/Cl/ConvClStg3Alarm` | 131 |
| `no_DeltaTCompHt/Cl/ConvClStg4Alarm` | 213 |
| `no_DeltaTModClAlarm(Fut)` | 132 |
| `no_DeltaT AlarmStatus` | 134 |

`no_DeltaTValue` is **Analog Output 130**, range 0–300 °F (-18 to 148.5 °C), default 0 °F —
the actual measured MAT − DAT.

### General status / diagnostics

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `no_GenericAlarm` | Binary Output | 102 | 0=False, 1=True — any alarm active on device | 0 |
| `no_DRStatus` | Multistate Output | 247 | 1=Inactive, 2=Active (Demand Response) | 1 |
| `no_mstpHeaderCrcError` | Analog Output | 78 | -9999 to 9999 | — |
| `no_mstpDataCrcErr` | Analog Output | 79 | -9999 to 9999 | — |

---

## 7. Configuration points — `Cfg_`

All writable.

### Occupancy setpoints

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `Cfg_Setpoints_OccCoolSp` | Analog Value | 4 | 40–120 °F (4.5–48.5 °C) | 76 °F (24.4 °C) |
| `Cfg_Setpoints_StbyCoolSp` | Analog Value | 5 | 40–120 °F | 80 °F (26.7 °C) |
| `Cfg_Setpoints_UnOccCoolSp` | Analog Value | 6 | 40–120 °F | 85 °F (29.4 °C) |
| `Cfg_Setpoints_OccHeatSp` | Analog Value | 7 | 40–120 °F | 68 °F (20 °C) |
| `Cfg_Setpoints_StbyHeatSp` | Analog Value | 8 | 40–120 °F | 65 °F (18.3 °C) |
| `Cfg_Setpoints_UnOccHeatSp` | Analog Value | 9 | 40–120 °F | 55 °F (12.8 °C) |

### Thermostat behavior

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `Cfg_Thermostat_SysSwitch` | Multistate Value | 8 | 1=Auto, 2=Cool, 3=Heat, 4=EmergHeat, 5=Off | 1 |
| `Cfg_Thermostat_SystemChangeOver` | Binary Value | 157 | 0=Auto, 1=Manual (Manual removes Auto from SysSwitch) | 0 |
| `Cfg_Thermostat_SystemConfig` | Multistate Value | 36 | 1=off/heat, 2=off/cool, 3=off/cool/heat, 4=off/Auto/cool/heat, 5=off/Auto/cool/heat/EmHeat | 5 |
| `Cfg_Thermostat_BypOverrideTime` | Analog Value | 10 | 0–1080 min | 180 min |
| `Cfg_Thermostat_MinCoolSp` | Analog Value | 12 | 50–99 °F (10–37 °C) | 50 °F |
| `Cfg_Thermostat_MaxHeatSp` | Analog Value | 13 | 40–90 °F (4.5–32 °C) | 90 °F |
| `Cfg_Thermostat_Deadband` | Analog Value | 101 | 2–9 Δ°F (1–5 Δ°C) | 3 Δ°F |
| `Cfg_Thermostat_HtAdjStPt` | Analog Value | 257 | -30 to 30 Δ°F | 0 |
| `Cfg_Thermostat_ClAdjStPt` | Analog Value | 256 | -30 to 30 Δ°F | 0 |
| `Cfg_Thermostat_AdjStPt` | Analog Value | — | -30 to 30 Δ°F | 0 |
| `Cfg_Thermostat_TempOffSpLimit` | Analog Value | 102 | 0–30 Δ°F (0–16.5 Δ°C) | 30 Δ°F |
| `Cfg_Thermostat_Override` | Binary Value | 135 | 0=Normal, 1=Override — **not persisted across power cycle** | 0 |
| `Cfg_Thermostat_TstUnitSel` | Binary Value | 136 | 0=Imperial, 1=Metric (display units) | 0 |
| `Cfg_Thermostat_CommUnitSel` | Binary Value | 2060 | 0=Fahrenheit, 1=Celsius (**units on the wire**) — **not present on verified firmware, see §11** | 0 |
| `Cfg_DemandLimCtl_TempDiffSp` | Analog Value | 38 | 0–10 Δ°F (0–5.5 Δ°C) | 3 Δ°F |

> `Cfg_Thermostat_CommUnitSel` (BV 2060) is documented as controlling the unit of
> temperature values read and written over BACnet. **It does not exist on the firmware
> verified in §11** — not at BV 2060, and absent from the device's object list entirely.
> That device serves Fahrenheit on the wire. Probe before assuming either way; do not
> confuse it with `Cfg_Thermostat_TstUnitSel` (BV 136), which sets *display* units only
> and says nothing about the wire.

### Equipment and control

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `Cfg_Equip_EquipType` | Multistate Value | 7 | 1=Conventional, 2=ASHP (air source heat pump), 3=WSHP (water source) | 1 |
| `Cfg_Stdby_OccSts` | Binary Value | 36 | 0=Unoccupied, 1=Occupied | 0 |
| `Cfg_Control_MainSensor` | Multistate Value | 9 | 1=Local Temp/Hum, 2=Remote Temp/Hum, 3=Multi Temp/Hum | 1 |
| `Cfg_Control_PowerupDelay` | Analog Value | 14 | 0–300 s | 10 s |
| `Cfg_Control_SmokeMode` | Multistate Value | 10 | 1=No Override, 2=Shutdown, 3=Pressurize, 4=Depressurize | 1 |
| `Cfg_ZoneMultiSens_Control` | Multistate Value | 130 | 1=Avg, 2=Min, 3=Max, 4=Smart | 1 |
| `Cfg_ZoneMultiSens_Sens1_Wt` | Analog Value | 33 | 0–10 (0=Disable) | 10 |

### Recovery ramps

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `Cfg_Recovery_MinCoolRampRate` | Analog Value | 16 | 0–20 Δ°F/hr | 2 Δ°F/hr |
| `Cfg_Recovery_MaxCoolRampRate` | Analog Value | 18 | 0–20 Δ°F/hr | 6 Δ°F/hr |
| `Cfg_Recovery_MinCoolRampTemp` | Analog Value | 15 | -40 to 120 °F | 90 °F |
| `Cfg_Recovery_MaxCoolRampTemp` | Analog Value | 17 | -40 to 120 °F | 70 °F |
| `Cfg_Recovery_MinHeatRampRate` | Analog Value | 20 | 0–36 Δ°F/hr | 2 Δ°F/hr |
| `Cfg_Recovery_MaxHeatRampRate` | Analog Value | 22 | 0–36 Δ°F/hr | 8 Δ°F/hr |
| `Cfg_Recovery_MinHeatRampTemp` | Analog Value | 19 | -40 to 120 °F | 0 °F |
| `Cfg_Recovery_MaxHeatRampTemp` | Analog Value | 21 | -40 to 120 °F | 60 °F |

### Sensor calibration offsets

| Point | Type | Inst | Range | Default |
| --- | --- | --- | --- | --- |
| `Cfg_LocalSensCalOffset_Temp` | Analog Value | 23 | -10 to 10 Δ°F (-5.5 to 5.5 Δ°C) | 0 |
| `Cfg_LocalSensCalOffset_Hum` | Analog Value | 103 | -10 to 10 %RH | 0 |
| `Cfg_SylkCalOffset_SylkBus2Temp` | Analog Value | 24 | -10 to 10 Δ°F | 0 |

(Additional per-Sylk-address offsets follow the same `Cfg_SylkCalOffset_SylkBus<n>Temp|RH` pattern.)

### Network fail-detect (point sharing)

When a `ni_` shared sensor value is not rewritten within its delay, the device falls
back. Each shared point has four config objects:

- `..._FailDetEn` — Binary Value, `0=Disable, 1=Enable`
- `..._FailFalbck` — Analog Value, `0=InvalidValue (Null), 1=LastKnownGoodValue, 2=FixedValue`
- `..._FailFxdVal` — the value used when Fallback = 2
- `..._FailDetDly` — Analog Value, 0–3600 s

| Shared point | `FailDetEn` | `FailFalbck` | `FailFxdVal` | `FailDetDly` | Default delay | Default enable |
| --- | --- | --- | --- | --- | --- | --- |
| Occupancy sensor (`Cfg_NetOccSen…`) | BV 159 | AV 262 | BV 160 | AV 263 | 600 s | Disable |
| OA temp (`Cfg_NetOAT…`) | BV 163 | AV 270 | AV 272 | AV 271 | 600 s | Enable |
| OA humidity (`Cfg_NetOAHum…`) | BV 162 | AV 267 | AV 269 | AV 268 | 600 s | Enable |
| Shutdown (`Cfg_NetShtdwn…`) | BV 164 | AV 273 | BV 165 | AV 274 | 300 s | Enable |
| Space CO2 (`Cfg_NetSpceCO2…`) | BV 166 | AV 275 | AV 277 | AV 276 | 300 s | Enable |
| Space RH (`Cfg_NetSpceRH…`) | BV 167 | AV 278 | AV 280 | AV 279 | 300 s | Enable |
| Space temp (`Cfg_NetSpceTmp…`) | BV 168 | AV 281 | AV 283 | AV 282 | 300 s | Enable |
| WSHP enable state (`Cfg_NetWSHPEnSt…`) | BV 169 | AV 284 | BV 170 | AV 285 | 900 s | Enable |
| WSHP enable value (`Cfg_NetWSHPEnVal…`) | BV 171 | AV 286 | AV 287 | AV 288 | 600 s | Enable |

All fallbacks default to `0 = InvalidValue (Null)`. Fail-detect only fires when the
input is NULL/unbound and `FailDetEn` is true.

---

## 8. Alarm objects

Read-only. Pattern: `Alarm_UI_*` is the raw source point; `AlarmPriority_*` carries the severity.

### Sensor-fault alarms

| Source point | Type | Inst | Priority point | Type | Inst |
| --- | --- | --- | --- | --- | --- |
| `Alarm_UI_SpcTemp` | Analog Input | 12 | `AlarmPriority_TempSens` | Multistate Output | 13 |
| `Alarm_InternalHumSens` | Analog Input | 2 | `AlarmPriority_HumSens` | Multistate Output | 14 |
| `Alarm_UI_MATemp` | Analog Input | 4 | `AlarmPriority_MATempAlarm_Fault` | Multistate Output | 9 |
| `Alarm_UI_OATemp` | Analog Input | 5 | `AlarmPriority_OATempAlarm_Fault` | Multistate Output | 10 |
| `Alarm_UI_DATemp` | Analog Input | 6 | `AlarmPriority_DATempAlarm_Fault` | Multistate Output | 11 |
| `Alarm_UI_RATemp` | Analog Input | 18 | `AlarmPriority_RATempAlarm_Fault` | Multistate Output | 110 |
| `Alarm_UI_CO2Lvl` | Analog Input | 7 | `AlarmPriority_CO2LvlAlarm_Fault` | Multistate Output | 12 |
| `Alarm_UI_CompDASens` | Analog Input | 14 | `AlarmPriority_CompDAAlarm_Fault` | Multistate Output | 22 |
| `Alarm_UI_HeatPumpFreq` | Analog Input | 15 | `AlarmPriority_HeatPumpFreqAlarm_Fault` | Multistate Output | 23 |

Temperature/CO2 fault priority enum: `1=Nml, 2=Med Priority (Out of Range), 3=High Priority (Sensor Failure)`.

`AlarmPriority_TempSens` / `AlarmPriority_HumSens` enum: `1=Nml, 2=Med, 3=High`.
High occurs when the only configured sensor has failed; Medium when a redundant
sensor is still reliable. If a valid **network** temperature/humidity is available,
what would be High is reported as Medium.

### Digital-input alarms

| Source point | Type | Inst | Priority point | Type | Inst |
| --- | --- | --- | --- | --- | --- |
| `Alarm_UI_OccSens` | Binary Input | 3 | `AlarmPriority_OccSensFault` | Binary Output | 69 |
| `Alarm_UI_DirtyFilter` | Binary Input | 4 | `AlarmPriority_DirtyFiltFault` | Binary Output | 70 |
| `Alarm_UI_AirFlwSts` | Binary Input | 5 | `AlarmPriority_AirFlwFault` | Binary Output | 71 |
| `Alarm_UI_Shutdown` | Binary Input | 6 | `AlarmPriority_ShutdownFault` | Binary Output | 72 |
| `Alarm_UI_WtrFlwSts` | Binary Input | 7 | `AlarmPriority_WtrFlwFault` | Binary Output | 73 |

Binary priority enum: `0=Nml, 1=Med Priority`.

### Standalone alarms

Binary Output unless noted; enum `0=Nml, 1=High Priority` unless noted.

| Point | Type | Inst | Notes |
| --- | --- | --- | --- |
| `AlarmPriority_SupplyFan` | Binary Output | 64 | Supply fan status mismatch |
| `AlarmPriority_SpaceFreezeProtect` | Binary Output | 65 | Space temp freeze protection |
| `AlarmPriority_WaterFlwPrf` | Binary Output | 66 | Proof of water flow |
| `AlarmPriority_SpcTempHI_Lolimit` | Binary Output | 68 | `1=Med Priority` |
| `AlarmPriority_Co2lvlHighlimit` | Binary Output | 100 | `1=Med Priority`, CO2 threshold exceeded |
| `Alarm_StPtOutOfRangeAlm` | Binary Output | 63 | No priority assigned |
| `AlarmPriority_DirtyFilter` | Binary Output | 88 | Runtime-based dirty filter |
| `AlarmPriority_HeatPumpFail` | Binary Output | 91 | |
| `AlarmPriority_UnknownTime` | Binary Output | 92 | Clock not set |
| `AlarmPriority_ProximitySensAlarm` | Binary Output | 93 | |
| `AlarmPriority_PckEcon_Fault` | Binary Output | 99 | Packaged economizer fault input |
| `AlarmPriority_WindowOpen` | Binary Output | 101 | |
| `AlarmPriority_Sylk11ActuatorFail` | Binary Output | 109 | Detail: 2=UnderV, 3=OverV, 4=Stall, 5=OverV+Stall, 6=UnderV+Stall |
| `AlarmPriority_CoilFreezeProtAlm` | Binary Output | 126 | MAT below low limit (default 45 °F, range 35–65 °F) |
| `Alarm_SylkCommFail` | Multistate Output | 24 | 1=Normal, 2–12 = SylkAddr2..12 Fail, 13=ManySylkFail (7 reserved for future) |

### Economizer fault detection & diagnostics

| Point | Type | Inst | Meaning |
| --- | --- | --- | --- |
| `AlarmPriority_Econ_FDD_NEWIS` | Binary Output | 121 | Not economizing when it should |
| `AlarmPriority_Econ_FDD_DNM` | Binary Output | 122 | Damper not modulating |
| `AlarmPriority_Econ_FDD_EWISN` | Binary Output | 123 | Economizing when it should not |
| `AlarmPriority_Econ_FDD_EOA` | Binary Output | 124 | Excess outdoor air |
| `AlarmPriority_EconomizerFailure` | Binary Output | 125 | Legacy roll-up, retained for backward compatibility only |
| `AlarmPriority_IntEconomizerFailure` | Multistate Output | 187 | 1=Normal, 2=DamperStuckOpen, 3=DamperStuckAtMin, 4=BadOrUnpluggedActuator, 5=ActuatorMechanicallyDisconnected (2–5 all High) |
| `AlarmPriority_DeltaT AlarmStatus` | Multistate Output | 133 | 1=Green (Normal), 2=Orange (Med), 3=Red (High); 4–7 are disable/unavailable states |

---

## 9. Display, Calendar and Schedule objects

| Name | Object type | Inst | Notes |
| --- | --- | --- | --- |
| `OaTemp_Display` | Analog Output | 75 | Local OA temp, falls back to Internet value. Display only. |
| `OaHum_Display` | Analog Output | 76 | Local OA humidity, falls back to Internet value. Display only. |
| `EnumSchedule` | Schedule | 2 | Main schedule, default Mon–Fri 06:00–18:00. Values: `0=Occupied, 1=UnOccupied, 3=StandBy, 255=Null` |
| `PurgeSchedule` | Schedule | 3 | `0=PurgeOff, 1=PurgeOn`. Default off for all 5 days. |
| `Calendar1`–`Calendar10` | Calendar | 3–12 | **Present but non-functional** — see §3. |

> Schedule present-values are **0-based** here (0=Occupied), unlike the 1-based
> Multistate occupancy points. Do not reuse the same mapping for both.

---

## 10. Proprietary device properties

Read/written on the Device object by property identifier.

| ID | Description | Type |
| --- | --- | --- |
| 1028 | MS/TP auto-MAC minimum value | Number |
| 1029 | MS/TP auto-MAC maximum value | Number |
| 1030 | MS/TP auto-MAC disable | Boolean |
| 1203 | Wi-Fi IPv4 address | Char[4] |
| 1204 | Wi-Fi IPv4 subnet mask | Char[4] |
| 1205 | Wi-Fi default gateway | Char[4] |
| 1206 | Wi-Fi DHCP enable | Boolean |
| 1231 | Network physical layer | 0=Standalone, 1=WiFi, 2=MSTP, 3=WiFi_MSTP |
| 1232 | BACnet/IP UDP port | Number |
| 1233 | BACnet/IP network number | Number |
| 1237 | Temperature unit | 0=F, 1=C |
| 1238 | Language | 0=English, 1=French, 2=Spanish |
| 1239 | Country code | String |
| 1240 | GUI brightness | Number |
| 1241 | User persona | Bitfield: installer/admin/basic/visitor |
| 1243 | Advanced user password | String |
| 1244 | Basic user password | String |
| 1246 | Contractor name | String |
| 1247 | Contractor telephone | String |
| 1248 | Contractor email | String |
| 1249 | Device configured | Boolean |
| 1250 | Display options | Number |
| 1251 | Proximity sensor configured | Boolean |
| 1252 | Time format | 0=12HOUR, 1=24HOUR |
| 1253 | Basic user permission | Number |
| 1254 | Admin user permission | Number |
| 1255 | Visitor view type | 0=Lock_Screen, 1=Simplified |
| 1256 | Basic user view type | 0=Standard, 1=Simplified |
| 1257 | Visitor permission | Number |
| 1258 | Wi-Fi network type | 0=Cloud, 1=Honeywell_Gateway, 2=BACnetIP |
| 1259 | BACnet security type | 0=Open, 1=Secured |
| 1260 | Connection status | 0=Not_Configured, 1=Router_Connected, 2=Cloud_Connected, 3=Gateway_Connected, 4=Connection_Lost |
| 1261 | Wi-Fi MAC address | Char[8] |
| 1262 | Wi-Fi RSSI | Number |

---

## 11. Transcription notes

### Corrections verified against hardware

Checked on 2026-09-14 against a TC500A at device instance 2 (BACnet/IP) by reading each
object's `objectName` property and comparing it to the name this document gives. These
tables have been **corrected to match the device**, and therefore deliberately differ
from the manufacturer PDF. 39 of 40 points in `points.yaml` now round-trip correctly.

- **The source mislabels every `no_` multistate point as "Multistate Value". They are all
  Multistate Output.** The same applies to `AlarmPriority_*` / `Alarm_*` multistate
  points. Verified individually: `no_LocalOccSensState` (1), `no_EffOccSensState` (2),
  `no_ManualOverride` (4), `no_SmokeMode` (5), `no_SetpointSts` (7),
  `no_ApplicationCommandMode` (8), `no_EffSchCurrentState` (18), `no_EffSchNextState`
  (19), `no_EffOccState` (20), `AlarmPriority_CO2LvlAlarm_Fault` (12),
  `AlarmPriority_TempSens` (13), `AlarmPriority_HumSens` (14),
  `AlarmPriority_CompDAAlarm_Fault` (22).

  This error is confined to the detail chapters (source Table 41 p.98, Table 25 p.61 and
  the alarm tables). The basic-setup table (§4) and the prefix convention (§2) had it
  right all along — the opposite of the precedence note below, which applies only to
  *spelling*.

  This matters because the wrong type **fails silently**. The Value instances are occupied
  by unrelated `Cfg_` objects that return plausible values: MSV 20 is `Cfg_Heat_HeatType`
  (not `no_EffOccState`), MSV 18 is `Cfg_FanSpeed_HeatMulti`, MSV 19 is
  `Cfg_FanSpeed_DefaultMode`, MSV 7 is `Cfg_Equip_EquipType`, MSV 12/13/14/22 are
  `Cfg_FanType` / `Cfg_Cool_CoolType` / `Cfg_FanSpeed_VentMode` / `Cfg_Econ_EconomizerType`.
  Reading occupancy from MSV 20 returns a heat-type code that reads as a valid occupancy
  enum.

- `ni_OccManCom` (MSV 4) and `no_ManualOverride` (MSO 4) are **separate objects**, not one
  object presented twice. Likewise `Cfg_Thermostat_SysSwitch` (MSV 8) and
  `no_ApplicationCommandMode` (MSO 8) — the shared instance number is not a conflict.

- `AlarmPriority_HeatPumpFreqFault` is named `AlarmPriority_HeatPumpFreqAlarm_Fault`
  on the device.

- `Cfg_Thermostat_CommUnitSel` (BV 2060) **does not exist** — not at that instance, and
  absent from the device's full 693-object list. Only `Cfg_Thermostat_TstUnitSel`
  (BV 136, display units) is present. The verified device serves Fahrenheit on the wire.

Unverified but following the same prefix rule, so presumed Multistate Output:
`AlarmPriority_MATempAlarm_Fault` (9), `AlarmPriority_OATempAlarm_Fault` (10),
`AlarmPriority_DATempAlarm_Fault` (11), `AlarmPriority_RATempAlarm_Fault` (110) —
these were already documented as Output and confirmed as such.

### Discrepancies in the source, preserved rather than fixed

- The basic-setup table (§4) labels `ni_*` points "Read Only"; Chapter 6 says all
  network inputs are writable. Chapter 6 is authoritative.
- The source spells some points inconsistently across tables
  (`no_DehumAxtive`/`no_DehumActive`, `Cfg_Setpoints_OccHeatlSp`/`Cfg_Setpoints_OccHeatSp`,
  `no_DmprPos`/`no_OaDmprPos`, `ni_NetSchNextstate`/`ni_NetSchNextState`,
  `AlarmPriority_Co2LvlHighLimit`/`AlarmPriority_Co2lvlHighlimit`). The spelling used
  in the detail chapters is preferred above.
- `no_GenericAlarm` (BO 102) is listed twice in the source with identical values.
- `AlarmPriority_ShutdownFault` (BO 72) appears twice with different priority
  enumerations (`1=Med Priority` in the digital-input table, `1=High Priority` in the
  standalone table).
- `Cfg_Thermostat_AdjStPt` appears in the demand-shift table without an instance ID.
- The full object list in the source appendices names many additional
  `Cfg_*` points (staging limits, fan coil, Delta-T, economizer curves, service
  reminders) whose instance IDs are not published in the guide.
