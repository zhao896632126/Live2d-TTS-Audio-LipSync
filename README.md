# Live2d-TTS-Audio-LipSync
Live2d整合科大讯飞在线TTS，播放并实时口型同步案例

1.安装Node.js

2.npm install

3.npm run dev


--------------------------------------------------------------------------------------

实现思路:Web Audio API播放音频实时获取声音分贝值，转化成0-1区间的值，实时调整Live2d模型ParamMouthOpenY参数（每秒30次）
