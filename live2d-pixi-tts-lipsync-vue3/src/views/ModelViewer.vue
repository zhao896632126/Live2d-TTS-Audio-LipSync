<template>
    <div style="width:100%;height:100%;z-index: -1000;">

        <input style="width: 200px;height: 25px;" v-model="text"/>

        <button style="width: 100px;height: 30px;" @click="start_tts()">TTS</button>

        <canvas id="canvas_view"></canvas>
    </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'
import * as PIXI from 'pixi.js'
import {
    Live2DModel,
    MotionPreloadStrategy,
    InternalModel,
} from 'pixi-live2d-display';

//import TtsRecorder from "../assets/tts/audio";

let text = reactive("你好");

// 挂载pixi
window.PIXI = PIXI;

let model;
let updateFn;

onMounted(() => {
    initModel();
})

const setMouthOpenY = v => {
    v = Math.max(0, Math.min(1, v));
    console.log("setMouthOpenY:::" + v);

    model.internalModel.motionManager.update = () => {
        updateFn.call(model.internalModel.motionManager, model.internalModel.coreModel, Date.now() / 1000);
        // overwrite the parameter after calling original update function
        model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", v);
    }

}

async function initModel() {
    // 引入模型
    model = await Live2DModel.from('../../src/assets/Haru/Haru.model3.json', { motionPreload: MotionPreloadStrategy.NONE, })
    updateFn = model.internalModel.motionManager.update;

    // 创建模型对象
    const app = new PIXI.Application({
        // 配置模型舞台
        view: document.getElementById('canvas_view'),
        // 背景是否透明
        transparent: true,
        autoDensity: true,
        autoResize: true,
        antialias: true,
        autoUpdate: false,
        // 高度
        height: '1080',
        // 宽度
        width: '1900'
    })

    // 鼠标跟踪方法
    model.trackedPointers = [{ id: 1, type: 'pointerdown', flags: true }, { id: 2, type: 'mousemove', flags: true }]
    // 添加模型到舞台
    app.stage.addChild(model)
    // 模型的缩放
    model.scale.set(0.2)
    // 模型的位置,x,y相较于窗口左上角
    model.x = 0
    // 添加模型状态管理器
    const a = new InternalModel(model)
    model.InternalModel = a


    // 绑定模型点击事件动作
    model.on('pointerdown', (hitAreas) => {
        // hitAreas:模型的一些上下文
        const { x, y } = hitAreas.data.global
        const point = model.hitTest(x, y)
        model.motion("TapBody");
    });

    // model.idleMotionPriority = "TapHead"

    // 绑定模型拖拽方法
    draggable(model);
    //添加模型范围遮罩
    addFrame(model);

    // 查看模型触发区域
    var hitAreas = model.internalModel.hitAreas;
    // console.log(hitAreas)

    console.log(model)
}

/**
 * 模型区域范围遮罩
 * @param {Live2DModel} model -模型对象
 */
function addFrame(model) {
    const foreground = PIXI.Sprite.from(PIXI.Texture.WHITE);
    foreground.width = model.internalModel.width;
    foreground.height = model.internalModel.height;
    foreground.alpha = 0.2;

    model.addChild(foreground);
    foreground.visible = true
}
/**
 * 模型拖拽方法
 * @param {Live2DModel} model -模型对象
 */
function draggable(model) {
    model.buttonMode = true;
    model.on("pointerdown", (e) => {
        model.dragging = true;
        model._pointerX = e.data.global.x - model.x;
        model._pointerY = e.data.global.y - model.y;
    });
    model.on("pointermove", (e) => {
        if (model.dragging) {
            model.position.x = e.data.global.x - model._pointerX;
            model.position.y = e.data.global.y - model._pointerY;
        }
    });
    model.on("pointerupoutside", () => (model.dragging = false));
    model.on("pointerup", () => (model.dragging = false));
}


/*
    TTS相关
*/
import CryptoJS from 'crypto-js'
import { Base64 } from 'js-base64'

const transWorker = new Worker(new URL('../assets/tts/transcode.worker.js', import.meta.url))

const APPID = "b44eed48";
const API_SECRET = "MGQ4YTkzMTExZGQwMDk4YWJiMjZiNzAx";
const API_KEY = "409de791c388a014294a9a32ff2838ee";

function getWebsocketUrl() {
    return new Promise((resolve, reject) => {
        var apiKey = API_KEY
        var apiSecret = API_SECRET
        var url = 'wss://tts-api.xfyun.cn/v2/tts'
        var host = location.host
        var date = new Date().toGMTString()
        var algorithm = 'hmac-sha256'
        var headers = 'host date request-line'
        var signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`
        var signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
        var signature = CryptoJS.enc.Base64.stringify(signatureSha)
        var authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
        var authorization = btoa(authorizationOrigin)
        url = `${url}?authorization=${authorization}&date=${date}&host=${host}`
        resolve(url)
    })
}
const TTSRecorder = class {
    constructor({
        speed = 30,
        voice = 50,
        pitch = 50,
        voiceName = 'xiaoyan',
        appId = APPID,
        text = '',
        tte = 'UTF8',
        defaultText = '请输入您要合成的文本',
    } = {}) {
        this.speed = speed
        this.voice = voice
        this.pitch = pitch
        this.voiceName = voiceName
        this.text = text
        this.tte = tte
        this.defaultText = defaultText
        this.appId = appId
        this.audioData = []
        this.rawAudioData = []
        this.audioDataOffset = 0
        this.status = 'init'
        transWorker.onmessage = (e) => {

            console.log(e)

            this.audioData.push(...e.data.data)
            this.rawAudioData.push(...e.data.rawAudioData)
        }
    }
    // 修改录音听写状态
    setStatus(status) {
        this.onWillStatusChange && this.onWillStatusChange(this.status, status)
        this.status = status
    }

    // 设置合成相关参数
    setParams({ speed, voice, pitch, text, voiceName, tte }) {
        speed !== undefined && (this.speed = speed)
        voice !== undefined && (this.voice = voice)
        pitch !== undefined && (this.pitch = pitch)
        text && (this.text = text)
        tte && (this.tte = tte)
        voiceName && (this.voiceName = voiceName)
        this.resetAudio()
    }
    // 连接websocket
    connectWebSocket() {
        this.setStatus('ttsing')
        return getWebsocketUrl().then(url => {
            let ttsWS
            if ('WebSocket' in window) {
                ttsWS = new WebSocket(url)
            } else if ('MozWebSocket' in window) {
                ttsWS = new MozWebSocket(url)
            } else {
                alert('浏览器不支持WebSocket')
                return
            }
            this.ttsWS = ttsWS
            ttsWS.onopen = e => {
                this.webSocketSend()
                this.playTimeout = setTimeout(() => {
                    this.audioPlay()
                }, 1000)
            }
            ttsWS.onmessage = e => {
                this.result(e.data)
            }
            ttsWS.onerror = e => {
                clearTimeout(this.playTimeout)
                this.setStatus('errorTTS')
                alert('WebSocket报错，请f12查看详情')
                console.error(`详情查看：${encodeURI(url.replace('wss:', 'https:'))}`)
            }
            ttsWS.onclose = e => {
                // console.log(e)
            }
        })
    }
    // 处理音频数据
    transToAudioData(audioData) { }
    // websocket发送数据
    webSocketSend() {
        var params = {
            common: {
                app_id: this.appId, // APPID
            },
            business: {
                aue: 'raw',
                // sfl= 1,
                auf: 'audio/L16;rate=16000',
                vcn: this.voiceName,
                speed: this.speed,
                volume: this.voice,
                pitch: this.pitch,
                bgs: 0,
                tte: this.tte,
            },
            data: {
                status: 2,
                text: this.encodeText(
                    this.text || this.defaultText,
                    this.tte === 'unicode' ? 'base64&utf16le' : ''
                )
            },
        }
        this.ttsWS.send(JSON.stringify(params))
    }
    encodeText(text, encoding) {
        switch (encoding) {
            case 'utf16le': {
                let buf = new ArrayBuffer(text.length * 4)
                let bufView = new Uint16Array(buf)
                for (let i = 0, strlen = text.length; i < strlen; i++) {
                    bufView[i] = text.charCodeAt(i)
                }
                return buf
            }
            case 'buffer2Base64': {
                let binary = ''
                let bytes = new Uint8Array(text)
                let len = bytes.byteLength
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i])
                }
                return window.btoa(binary)
            }
            case 'base64&utf16le': {
                return this.encodeText(this.encodeText(text, 'utf16le'), 'buffer2Base64')
            }
            default: {
                return Base64.encode(text)
            }
        }
    }
    // websocket接收数据的处理
    result(resultData) {
        let jsonData = JSON.parse(resultData)
        // 合成失败
        if (jsonData.code !== 0) {
            alert(`合成失败: ${jsonData.code}:${jsonData.message}`)
            console.error(`${jsonData.code}:${jsonData.message}`)
            this.resetAudio()
            return
        }
        transWorker.postMessage(jsonData.data.audio)

        if (jsonData.code === 0 && jsonData.data.status === 2) {
            this.ttsWS.close()
        }
    }
    // 重置音频数据
    resetAudio() {
        this.audioStop()
        this.setStatus('init')
        this.audioDataOffset = 0
        this.audioData = []
        this.rawAudioData = []
        this.ttsWS && this.ttsWS.close()
        clearTimeout(this.playTimeout)
    }
    // 音频初始化
    audioInit() {
        let AudioContext = window.AudioContext || window.webkitAudioContext
        if (AudioContext) {
            this.audioContext = new AudioContext()
            this.audioContext.resume()
            this.audioDataOffset = 0

            // 新建分析仪
            this.analyser = this.audioContext.createAnalyser();
            // 根据 频率分辨率建立个 Uint8Array 数组备用
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        }
    }
    // 音频播放
    audioPlay() {
        this.setStatus('play')
        let audioData = this.audioData.slice(this.audioDataOffset)
        this.audioDataOffset += audioData.length
        let audioBuffer = this.audioContext.createBuffer(1, audioData.length, 22050)
        let nowBuffering = audioBuffer.getChannelData(0)
        if (audioBuffer.copyToChannel) {
            audioBuffer.copyToChannel(new Float32Array(audioData), 0, 0)
        } else {
            for (let i = 0; i < audioData.length; i++) {
                nowBuffering[i] = audioData[i]
            }
        }


        let bufferSource = this.bufferSource = this.audioContext.createBufferSource()
        bufferSource.buffer = audioBuffer
        bufferSource.connect(this.audioContext.destination)
        // 连接到 音频分析器
        bufferSource.connect(this.analyser);
        bufferSource.start()
        bufferSource.onended = event => {
            if (this.status !== 'play') {
                return
            }
            if (this.audioDataOffset < this.audioData.length) {
                this.audioPlay()
            } else {
                this.audioStop()
                //口型还原
                setMouthOpenY(0);
            }
        }
        this.syncLip();
    }
    syncLip() {
        console.log("this.status:::" + this.status);

        const o = 80;
        const arrayAdd = a => a.reduce((i, a) => i + a, 0);

        const run = () => {
            if (this.status !== 'play') return;
            this.analyser.getByteFrequencyData(this.frequencyData)
            const arr = [];
            // 频率范围还是太广了，跳采！
            for (var i = 0; i < 700; i += o) {
                arr.push(this.frequencyData[i]);
            }
            setMouthOpenY((arrayAdd(arr) / arr.length - 20) / 60);
            setTimeout(run, 1000 / 30);
        }

        run();
    };
    // 音频播放结束
    audioStop() {
        clearTimeout(this.playTimeout)
        this.audioDataOffset = 0
        if (this.bufferSource) {
            try {
                this.bufferSource.stop()
            } catch (e) {
                // console.log(e)
            }
        }
        this.setStatus('endPlay')
    }
    start() {
        if (this.audioData.length) {
            this.audioPlay()
        } else {
            if (!this.audioContext) {
                this.audioInit()
            }
            if (!this.audioContext) {
                alert('该浏览器不支持webAudioApi相关接口')
                return
            }
            this.connectWebSocket()
        }
    }
    stop() {
        this.audioStop()
    }
}

const ttsRecorder = new TTSRecorder();

function start_tts() {

    console.log("text:::"+text);
    //要合成的文本
    ttsRecorder.setParams({
        // 文本内容
        text: text,
        // 角色
        //  voiceName: '',
        // 语速
        speed: 50,
        // 音量
        voice: 50,
    });
    ttsRecorder.start();
}
function stop_tts() {
    ttsRecorder.stop();
}

</script>
    
<style lang="less" scoped></style>