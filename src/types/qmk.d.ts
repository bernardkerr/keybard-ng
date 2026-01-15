export type QMKSettings = {
    tabs: QMKSettingsTab[];
};

export type QMKSettingsTab = {
    name: string;
    fields: QMKSettingsField[];
};

type QMKSettingsBooleanField = {
    type: 'boolean';
    title: string;
    qsid: number;
    width?: number;
    bit?: number;  // Optional: if not provided, uses the whole value as boolean
};

type QMKSettingsIntegerField = {
    type: 'integer';
    title: string;
    qsid: number;
    min: number;
    max: number;
    width: number;
};

export type QMKSettingsField = QMKSettingsBooleanField | QMKSettingsIntegerField;
