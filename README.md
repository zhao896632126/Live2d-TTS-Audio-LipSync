# Live2d-TTS-Audio-LipSync
使用Live2d-Pixi-display插件，整合科大讯飞在线TTS，播放并实时口型同步案例

1.安装Node.js

2.npm install

3.npm run dev


--------------------------------------------------------------------------------------

实现思路:Web Audio API播放音频实时获取声音分贝值，转化成0-1区间的值，实时调整Live2d模型ParamMouthOpenY参数（每秒30次）

Live2d-Pixi-display相关:

1.Live2d-Pixi-display官方文档:https://guansss.github.io/pixi-live2d-display/api/index.html

2.参考资料:

(1)https://github.com/itorr/itorr/issues/7

(2)https://github.com/guansss/pixi-live2d-display/issues/78
