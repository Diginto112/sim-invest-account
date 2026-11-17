package com.siminvest.account;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "AccountExport")
public class AccountExportPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.length() > 12 * 1024 * 1024) {
            call.reject("账户快照为空或超过12MB，请减少回放记录后重试");
            return;
        }
        String filename = call.getString("filename", "sim-invest-account.json");
        if (filename == null || !filename.matches("[A-Za-z0-9._-]+\\.json")) {
            call.reject("快照文件名无效");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, intent, "saveDocument");
        } catch (ActivityNotFoundException error) {
            call.reject("当前设备没有可用的文件保存程序", error);
        }
    }

    @ActivityCallback
    private void saveDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject response = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK) {
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null) {
            call.reject("未取得文件保存位置");
            return;
        }
        String data = call.getString("data");
        if (data == null) {
            call.reject("账户快照已失效，请重新导出");
            return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new IOException("无法打开选定文件");
            stream.write(data.getBytes(StandardCharsets.UTF_8));
            stream.flush();
            response.put("saved", true);
            call.resolve(response);
        } catch (IOException | SecurityException error) {
            call.reject("账户快照未保存，请重新选择位置", error);
        }
    }
}
