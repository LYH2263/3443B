# PDF 导出中文字体配置

## 字体下载

请从 Google Fonts 下载 Noto Sans SC 字体：
https://fonts.google.com/noto/specimen/Noto+Sans+SC

## 放置字体文件

将以下字体文件放在此目录：
- `NotoSansSC-Regular.ttf` - 常规
- `NotoSansSC-Bold.ttf` - 粗体

## 字体配置说明

系统已在 `PdfExportService.php` 中配置好 `notosanssc` 字体，包含以下变体：
- R (Regular) - NotoSansSC-Regular.ttf
- B (Bold) - NotoSansSC-Bold.ttf
- I (Italic) - 映射到 Regular
- BI (Bold Italic) - 映射到 Bold

## 备选方案

如果无法下载 Noto Sans SC，可以使用以下方案：

### 方案一：使用系统字体
修改 `PdfExportService.php` 中的 `getChineseFontConfig()` 方法，使用系统已安装的中文字体。

### 方案二：使用 mPDF 内置 CJK 字体
mPDF 内置了一些中日韩字体支持，可以通过以下配置启用：

```php
$mpdfConfig = [
    'mode' => 'utf-8',
    'autoScriptToLang' => true,
    'autoLangToFont' => true,
    'backupSubsFont' => ['dejavusanscondensed', 'freeserif'],
];
```

## 验证字体

安装字体后，可以通过以下命令验证 PDF 导出功能：
```bash
php think clean:pdf-exports
```
