tempDict = {

  // UI strings
  'Robot':
    'Snap!机器人',  
  'Fullscreen mode':
    '全屏模式',
  'clone':
    '克隆',
  'connect to SnapRobot IP address %s':
    '连接到SnapRobot,IP地址 %s',
  'runCommand %l':
    '运行 %l', 
  'reportSensor %l':
    '报告 %l',
  'install app on SnapRobot':
    '将App安装到SnapRobot上',
  'when got event %remoteEvent':
    '当接收到远程消息 %remoteEvent',
  'remoteEvent':
    '远程消息'                     
};

// Add attributes to original SnapTranslator.dict.de
for (var attrname in tempDict) { SnapTranslator.dict.zh_CN[attrname] = tempDict[attrname]; };
