import * as PIXI from 'pixi.js'
import {
  Live2DModel,
  MotionPreloadStrategy,
  InternalModel,
} from 'pixi-live2d-display';

// 挂载pixi
window.PIXI = PIXI;

export async function init() {
  // const model = await Live2DModel.from('https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json', { motionPreload: MotionPreloadStrategy.NONE, })
  // 引入模型
  const model = await Live2DModel.from('../../src/assets/Haru/Haru.model3.json', { motionPreload: MotionPreloadStrategy.NONE, })
  const updateFn = model.internalModel.motionManager.update;

  const setMouthOpenY = v => {
    v = Math.max(0, Math.min(1, v));
    
    console.log("setMouthOpenY:::" + v);
    //model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', v);

    model.internalModel.motionManager.update = () => {
        updateFn.call(model.internalModel.motionManager, model.internalModel.coreModel, Date.now()/1000);
        // overwrite the parameter after calling original update function
        model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", v);
    }

  }

  // 创建模型对象
  const app = new PIXI.Application({
    // 配置模型舞台
    view: document.getElementById('canvas_view'),
    // 背景是否透明
    transparent: true,
    autoDensity: true,
    autoResize: true,
    antialias: true,
    autoUpdate:false,
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
  model.scale.set(0.3)
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

    //initAudioCtx();
  });

  // model.idleMotionPriority = "TapHead"

  // 绑定模型拖拽方法
  draggable(model);
  //添加模型范围遮罩
  addFrame(model);
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

  // 查看模型触发区域
  var hitAreas = model.internalModel.hitAreas;
  // console.log(hitAreas)



  //initAudioCtx();
  /*
    口型驱动相关
  */
  function initAudioCtx() {
    let playing = false;
    const audioCtx = new AudioContext();

    // 新建分析仪
    const analyser = audioCtx.createAnalyser();
    // 根据 频率分辨率建立个 Uint8Array 数组备用
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    // 取音频文件成 arraybuffer
    const request = new XMLHttpRequest();
    request.open('GET', '../../src/assets/audio/sample.mp3', true);
    request.responseType = 'arraybuffer';
    request.onload = () => {
      //navigator.mediaDevices.getUserMedia({ audio: true });

      const audioData = request.response;
      audioCtx.decodeAudioData(audioData, function (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        // 连接到 audioCtx
        source.connect(audioCtx.destination);
        // 连接到 音频分析器
        source.connect(analyser);
        // 开始播放
        source.start(0);
        source.onended = () => {
          console.log("end");
          playing = false;
        };
      });
    };
    request.send();
    syncLip();

    // 需要用到频谱的时候 从分析仪获取到 之前备用的 frequencyData 里
    const getByteFrequencyData = () => {
      analyser.getByteFrequencyData(frequencyData);
      return frequencyData;
    };

    function syncLip() {
      console.log("syncLip:::" + playing);

      const o = 80;
      const arrayAdd = a => a.reduce((i, a) => i + a, 0);
      playing = true;

      const run = () => {
        if (!playing) return;
        //const frequencyData = getByteFrequencyData();
        analyser.getByteFrequencyData(frequencyData)
        const arr = [];
        // 频率范围还是太广了，跳采！
        for (var i = 0; i < 700; i += o) {
          arr.push(frequencyData[i]);
        }
        setMouthOpenY((arrayAdd(arr) / arr.length - 20) / 60);
        setTimeout(run, 1000 / 30);
      }

      run();
    };

  }

  console.log(model)
}

