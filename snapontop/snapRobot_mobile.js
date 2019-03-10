SyntaxElementMorph.prototype.org_labelPart = SyntaxElementMorph.prototype.labelPart;
SyntaxElementMorph.prototype.labelPart = function (spec) {
	  var part;
	  part = this.org_labelPart(spec);
    if (spec === '%interaction') {
        part = new InputSlotMorph(
            null, // text
            false, // numeric?
            {
                'clicked' : ['clicked'],
                'pressed' : ['pressed'],
                'dropped' : ['dropped'],
                'mouse-entered' : ['mouse-entered'],
                'mouse-departed' : ['mouse-departed'],
                'scrolled-up' : ['scrolled-up'],
                'scrolled-down' : ['scrolled-down'],
                'stopped' : ['stopped'], // experimental                
                'gesture-right' : ['gesture-right'],                    
                'gesture-left' : ['gesture-left'],
                'gesture-up' : ['gesture-up'],
                'gesture-down' : ['gesture-down'],
                'gesture-turnClockwise' : ['gesture-turnClockwise'],
                'gesture-turnAnticlockwise' : ['gesture-turnAnticlockwise'],
                'gesture-doubleTapped' : ['gesture-doubleTapped'],
                'gesture-sequentRight' : ['gesture-sequentRight'],
                'gesture-sequentLeft' : ['gesture-sequentLeft'],
                'gesture-sequentUp' : ['gesture-sequentUp'],
                'gesture-sequentDown' : ['gesture-sequentDown'],                    
                'gesture-sequentTurnClockwise' : ['gesture-sequentTurnClockwise'],
                'gesture-sequentTurnAntiClockwise' : ['gesture-sequentTurnAntiClockwise']
            },
            true // read-only
        );
        part.isStatic = true;
    }	  
	  if (spec === '%remoteEvent') {
        part = new InputSlotMorph(
            null, // text
            false, // numeric?
            {
                'slideLeft' : ['slideLeft'],
                'slideRight' : ['slideRight'],
                'slideUp' : ['slideUp'],
                'slideDown' : ['slideDown'],
                'doubleTap' : ['doubleTap'],
                'rotateClockwise' : ['rotateClockwise'],
                'rotateAntiClockwise' : ['rotateAntiClockwise']
            },
            false // read-only
        );
        part.isStatic = true;	  		
	  }
	  return part;
};



//Hand_Morph

HandMorph.prototype.org_init = HandMorph.prototype.init;
HandMorph.prototype.init = function (aWorld) {
		this.org_init(aWorld);
    this.gestureTrack = [];
    this.gesturePoints = [];
    this.gestureBuffer = [];
    this.lastTouchVersion = 0; 
    this.lastPos = null;
    this.offsetToGenerateEvent = 10;
    this.angleToGenerateEvent = 0.2;
    this.generateContinuousEvent = true; 
    this.lastGestureType = 0;		
    this.readyForDoubleTapped = false;			
};

HandMorph.prototype.processTouchStart = function (event) {
    var myself = this,
        posInDocument = getDocumentPositionOf(this.world.worldCanvas);
        
    MorphicPreferences.isTouchDevice = true;
    clearInterval(this.touchHoldTimeout);
    if (event.touches.length === 1) {
    		this.gestureTrack = [];
    		this.gesturePoints = [];
    		this.gestureBuffer = [];
    		this.lastPos = new Point(
            event.touches[0].pageX - posInDocument.x,
            event.touches[0].pageY - posInDocument.y
        );
   			if (!this.lastTouchVersion){
   					this.lastTouchVersion = Date.now();
   			}else{
   					if (Date.now() - this.lastTouchVersion < 500) {
   							this.readyForDoubleTapped = true;
   					}else{
   							this.lastTouchVersion = Date.now();
   					}
   			}    		
        this.touchHoldTimeout = setInterval( // simulate mouseRightClick
            function () {
                myself.processMouseDown({button: 2});
                myself.processMouseUp({button: 2});
                event.preventDefault();
                clearInterval(myself.touchHoldTimeout);
            },
            400
        );
        this.processMouseMove(event.touches[0]); // update my position
        this.processMouseDown({button: 0});
        event.preventDefault();
    }
};

HandMorph.prototype.processTouchMove = function (event) {
	  var offset,
	      pos,
	      touch,
	      posInDocument = getDocumentPositionOf(this.world.worldCanvas);
	  
    MorphicPreferences.isTouchDevice = true;
    if (event.touches.length === 1) {
    	  touch = event.touches[0];
    	  pos = new Point(
            touch.pageX - posInDocument.x,
            touch.pageY - posInDocument.y
        );
        offset = Math.sqrt(Math.pow(pos.x - this.lastPos.x,2) + Math.pow(pos.y - this.lastPos.y,2));
        if (offset > 2) {
            if (this.morphAtPointer() instanceof StageMorph || this.morphAtPointer() instanceof SpriteMorph) {
        		    this.recordTouchMove(touch);
            }        
            this.lastPos = pos;
            this.processMouseMove(touch);
            clearInterval(this.touchHoldTimeout);
        }
    }
};

HandMorph.prototype.processTouchEnd = function (event) {
    MorphicPreferences.isTouchDevice = true;
    clearInterval(this.touchHoldTimeout);
    nop(event);
    if (this.readyForDoubleTapped && Date.now() - this.lastTouchVersion < 800) {
    		this.readyForDoubleTapped = false;
    		this.lastTouchVersion = 0;
    		this.processDoubleTapped();
    }
    if (this.morphAtPointer() instanceof StageMorph || this.morphAtPointer() instanceof SpriteMorph) {
				this.processGestrueTrack(); 
		}     
    this.processMouseUp({button: 0});
};

HandMorph.prototype.recordTouchMove = function (event) {
    var pos,
    		inittpos,
    		lastpos,
    		offset,
    		angle,
    		angleChange,
    		track,
        posInDocument = getDocumentPositionOf(this.world.worldCanvas);
        
    pos = new Point(
        event.pageX - posInDocument.x,
        event.pageY - posInDocument.y
    );	
    
    if (this.morphAtPointer() instanceof StageMorph  || this.morphAtPointer() instanceof SpriteMorph) {
    		this.gesturePoints.push(pos);		
    		if (this.gesturePoints.length > 1){
    	  		initpos = this.gesturePoints[0];
    	  		lastpos = this.gesturePoints[this.gesturePoints.length-2];
    	  		offset = Math.sqrt(Math.pow(pos.x-lastpos.x,2)+Math.pow(pos.y-lastpos.y,2));
    	  		angle = Math.atan2(pos.y-lastpos.y,pos.x-lastpos.x);
    	  		if (this.gestureTrack.length === 0){
    	  				angleChange = 0;
    	  		}else{
    	  				angleChange = calcChange(angle,this.gestureTrack[this.gestureTrack.length-1].angle);
    	  		}
    				track = {	offset			: offset,
    									angle 			: angle,
    									angleChange : angleChange};
    				this.gestureTrack.push(track);
    				if (this.generateContinuousEvent){
								this.gestureBuffer.push(track);
								this.identifyGesture();
						}
				}
    }   
    
    function calcChange(angle,lastangle){
    		var angleChange;
    		
    		angleChange = angle - lastangle;
    		if (angleChange > Math.PI){
    				angleChange -= 2*Math.PI;	
    		}
    		if (angleChange < -Math.PI){
    				angleChange += 2*Math.PI;
    		}
    	return angleChange;
    }
};

HandMorph.prototype.processDoubleTapped = function () {
		var expectedGesture = 'gestureDoubleTapped',
				stage;
				
		if (this.morphAtPointer() instanceof StageMorph) {
				stage = this.morphAtPointer(); 
		}else if (this.morphAtPointer() instanceof SpriteMorph){
				stage = this.morphAtPointer().parentThatIsA(StageMorph);
		}else{	
				return;
		}	
		
		if (stage[expectedGesture]){
				stage[expectedGesture]();
		}
		stage.children.forEach( function (morph) {
				if (morph[expectedGesture]) {
						morph[expectedGesture]();
				}
		});			
};

HandMorph.prototype.identifyGesture = function () {
		var i,
				distance = 0,
				sumAngleChange = 0,
				maxAngle,
				minAngle,
				direction = 0,             	// 0 : nothing
																	 	// 1 : move rightward
																	 	// 2 : move leftward
																	 	// 3 : move upward
																	 	// 4 : move downward
																	 	// 5 : turn clockwise
																	 	// 6 : turn antiClockwise		
				stage,															 	
				expectedGesture;

		if (this.morphAtPointer() instanceof StageMorph) {
				stage = this.morphAtPointer(); 
		}else if (this.morphAtPointer() instanceof SpriteMorph){
				stage = this.morphAtPointer().parentThatIsA(StageMorph);
		}else{	
				return;
		}	
		if (!this.gestureBuffer.length) {
				return;
		}				
		maxAngle = minAngle = this.gestureBuffer[0].angle;		
		for(i=0; i<this.gestureBuffer.length; i++){
				distance += this.gestureBuffer[i].offset;
				sumAngleChange += this.gestureBuffer[i].angleChange;

				if (this.gestureBuffer[i].angle > maxAngle){
						maxAngle = this.gestureBuffer[i].angle;
				}		
				if (this.gestureBuffer[i].angle < minAngle){
						minAngle = this.gestureBuffer[i].angle;
				}				
		}
		if (distance < 2) {
				return;
		}
		
		if (Math.abs(sumAngleChange) > this.angleToGenerateEvent*(this.lastGestureType === 2?0.8:(this.lastGestureType === 1?1.5:1))) {
				if (sumAngleChange > 0) {
						direction = 5;
				}else{
						direction = 6;
				}
				this.lastGestureType = 2;		
		}
		if (direction === 0 && distance > this.offsetToGenerateEvent) {
				if (Math.abs(sumAngleChange) < this.angleToGenerateEvent*(this.lastGestureType === 1?1.5:1))	{
						if (Math.abs(maxAngle) < 0.6){
								direction = 1;
						}else if (Math.abs(minAngle) > Math.PI-0.6){
								direction = 2;
						}else if (maxAngle > Math.PI/2 - 0.6 && maxAngle < Math.PI/2 + 0.6) {
								direction = 4;
						}else if (minAngle > -0.6-Math.PI/2 && minAngle < 0.6-Math.PI/2) {
								direction = 3;
						}	
						if (direction > 0) {
								this.lastGestureType = 1;
						}		
				}	
		}
		
		if (direction > 0) {
				this.gestureBuffer = [];
				if (direction === 1){
						expectedGesture = 'gesSequentRight';
				}else if (direction === 2) {
						expectedGesture = 'gesSequentLeft';
				}else if (direction === 3) {
						expectedGesture = 'gesSequentUp';
				}else if (direction === 4) {
						expectedGesture = 'gesSequentDown';
				}else if (direction === 5) {
						expectedGesture = 'gesSequentTurnClockwise';
				}else if (direction === 6) {
						expectedGesture = 'gesSequentTurnAntiClockwise';
				}
				if (stage[expectedGesture]){
						stage[expectedGesture]();
				}
				stage.children.forEach( function (morph) {
						if (morph[expectedGesture]) {
								morph[expectedGesture]();
						}
				});				
		}													
};

HandMorph.prototype.processGestrueTrack = function () {
		var expectedGesture,
				xBias,
				yBias,
				sumAngleChange = 0,
				stage,
				gtLen = this.gesturePoints.length;
				
		if (this.morphAtPointer() instanceof StageMorph) {
				stage = this.morphAtPointer(); 
		}else if (this.morphAtPointer() instanceof SpriteMorph){
				stage = this.morphAtPointer().parentThatIsA(StageMorph);
		}else{	
				return;
		}
		
		if ( gtLen > 1) {
				xBias = this.gesturePoints[gtLen-1].x - this.gesturePoints[0].x;
				yBias = this.gesturePoints[gtLen-1].y - this.gesturePoints[0].y;
				this.gestureTrack.forEach(function (track) {
						sumAngleChange += track.angleChange;
				});
				/*
				this.gestureTrack.forEach( function (track){
						alert(track.offset.toString()+'/'+track.angle.toString()+'/'+track.angleChange.toString());
				});
				*/ 
				//alert(gtLen.toString());
				if (sumAngleChange > 1) {
						expectedGesture = 'gestureTurnClockwise';
				}else if (sumAngleChange < -1) {
						expectedGesture = 'gestureTurnAnticlockwise';
				}else if (xBias > 15 && (yBias > -50 && yBias < 50)) {
						expectedGesture = 'gestureRight';
				}else if (xBias < -15 && (yBias > -50 && yBias < 50)) {
						expectedGesture = 'gestureLeft';
				}else if (yBias < -15 && (xBias > -50 && xBias < 50)) {
						expectedGesture = 'gestureUp';
				}else if (yBias > 15 && (xBias > -50 && xBias < 50)) {
						expectedGesture = 'gestureDown';
				}
				if (stage[expectedGesture]){
						stage[expectedGesture]();
				}
				stage.children.forEach( function (morph) {
						if (morph[expectedGesture]) {
								morph[expectedGesture]();
						}
				});														
		}	
};

// IDE_Morph layout

IDE_Morph.prototype.fixLayout = function (situation) {
    // situation is a string, i.e.
    // 'selectSprite' or 'refreshPalette' or 'tabEditor'
    var padding = this.padding,
        maxPaletteWidth;

    Morph.prototype.trackChanges = false;

    if (situation !== 'refreshPalette') {
        // controlBar
        this.controlBar.setPosition(this.logo.topRight());
        this.controlBar.setWidth(this.right() - this.controlBar.left());
        this.controlBar.fixLayout();

        // categories
        this.categories.setLeft(this.logo.left());
        this.categories.setTop(this.logo.bottom());
        this.categories.setWidth(this.paletteWidth);
    }

    // palette
    this.palette.setLeft(this.logo.left());
    this.palette.setTop(this.categories.bottom());
    this.palette.setHeight(this.bottom() - this.palette.top());
    this.palette.setWidth(this.paletteWidth);

    if (situation !== 'refreshPalette') {
        // stage
        if (this.isEmbedMode) {
            this.stage.setScale(Math.floor(Math.min(
                this.width() / this.stage.dimensions.x,
                this.height() / this.stage.dimensions.y
                ) * 10) / 10);

            this.embedPlayButton.size = Math.floor(Math.min(
                        this.width(), this.height())) / 3;
            this.embedPlayButton.setWidth(this.embedPlayButton.size);
            this.embedPlayButton.setHeight(this.embedPlayButton.size);

            if (this.embedOverlay) {
                this.embedOverlay.setExtent(this.extent());
            }

            this.stage.setCenter(this.center());
            this.embedPlayButton.setCenter(this.center());
        } else if (this.isAppMode) {
        	  if (!this.stage.enableFullScreen){
            		this.stage.setScale(Math.floor(Math.min(
                		(this.width() - padding * 2) / this.stage.dimensions.x,
                		(this.height() - this.controlBar.height() * 2 - padding * 2)
                    		/ this.stage.dimensions.y
            		) * 10) / 10);
            		this.stage.setCenter(this.center());
        		}else{
        			this.stage.setScale(1);
        			this.stage.backgrounddimensions = new Point(this.width(),this.height() - this.logo.height() - 40);
        			StageMorph.prototype.backgrounddimensions = this.stage.backgrounddimensions;
            	this.stage.resetExtent(new Point(this.width(),this.height() - this.logo.height() - 40));
            	this.stage.setTop(this.logo.bottom()+ padding);
            	this.stage.setLeft(this.left());
            }
        } else {
        	  if (this.stage.enableFullScreen){
        	  		this.stage.backgrounddimensions = new Point(this.width(),this.height() - this.logo.height() - 40);
        	  		StageMorph.prototype.backgrounddimensions = this.stage.backgrounddimensions;
        	  }
            this.stage.setScale(this.isSmallStage ? this.stageRatio : 1);
            this.stage.setTop(this.logo.bottom() + padding);
            this.stage.setRight(this.right());
            maxPaletteWidth = Math.max(
                200,
                this.width() -
                    this.stage.width() -
                    this.spriteBar.tabBar.width() -
                    (this.padding * 2)
            );
            if (this.paletteWidth > maxPaletteWidth) {
                this.paletteWidth = maxPaletteWidth;
                this.fixLayout();
            }
            this.stageHandle.fixLayout();
            this.paletteHandle.fixLayout();
        }

        // spriteBar
        this.spriteBar.setLeft(this.paletteWidth + padding);
        this.spriteBar.setTop(this.logo.bottom() + padding);
        this.spriteBar.setExtent(new Point(
            Math.max(0, this.stage.left() - padding - this.spriteBar.left()),
            this.categories.bottom() - this.spriteBar.top() - padding
        ));
        this.spriteBar.fixLayout();

        // spriteEditor
        if (this.spriteEditor.isVisible) {
            this.spriteEditor.setPosition(this.spriteBar.bottomLeft());
            this.spriteEditor.setExtent(new Point(
                this.spriteBar.width(),
                this.bottom() - this.spriteEditor.top()
            ));
        }

        // corralBar
        this.corralBar.setLeft(this.stage.left());
        this.corralBar.setTop(this.stage.bottom() + padding);
        this.corralBar.setWidth(this.stage.width());

        // corral
        if (!contains(['selectSprite', 'tabEditor'], situation)) {
            this.corral.setPosition(this.corralBar.bottomLeft());
            this.corral.setWidth(this.stage.width());
            this.corral.setHeight(this.bottom() - this.corral.top());
            this.corral.fixLayout();
        }
    }

    Morph.prototype.trackChanges = true;
    this.changed();
};


IDE_Morph.prototype.org_newProject = IDE_Morph.prototype.newProject;
IDE_Morph.prototype.newProject = function(){
	  StageMorph.prototype.enableFullScreen = true;
		this.org_newProject();
};
		
IDE_Morph.prototype.settingsMenu = function () {
    var menu,
        stage = this.stage,
        world = this.world(),
        myself = this,
        pos = this.controlBar.settingsButton.bottomLeft(),
        shiftClicked = (world.currentKey === 16);

    function addPreference(label, toggle, test, onHint, offHint, hide) {
        var on = '\u2611 ',
            off = '\u2610 ';
        if (!hide || shiftClicked) {
            menu.addItem(
                (test ? on : off) + localize(label),
                toggle,
                test ? onHint : offHint,
                hide ? new Color(100, 0, 0) : null
            );
        }
    }

    menu = new MenuMorph(this);
    menu.addItem('Language...', 'languageMenu');
    menu.addItem(
        'Zoom blocks...',
        'userSetBlocksScale'
    );
    menu.addItem(
        'Stage size...',
        'userSetStageSize'
    );
    if (shiftClicked) {
        menu.addItem(
            'Dragging threshold...',
            'userSetDragThreshold',
            'specify the distance the hand has to move\n' +
                'before it picks up an object',
            new Color(100, 0, 0)
        );
    }
    menu.addLine();
    /*
    addPreference(
        'JavaScript',
        function () {
            Process.prototype.enableJS = !Process.prototype.enableJS;
            myself.currentSprite.blocksCache.operators = null;
            myself.currentSprite.paletteCache.operators = null;
            myself.refreshPalette();
        },
        Process.prototype.enableJS,
        'uncheck to disable support for\nnative JavaScript functions',
        'check to support\nnative JavaScript functions'
    );
    */
    if (isRetinaSupported()) {
        addPreference(
            'Retina display support',
            'toggleRetina',
            isRetinaEnabled(),
            'uncheck for lower resolution,\nsaves computing resources',
            'check for higher resolution,\nuses more computing resources'
        );
    }
    addPreference(
        'Input sliders',
        'toggleInputSliders',
        MorphicPreferences.useSliderForInput,
        'uncheck to disable\ninput sliders for\nentry fields',
        'check to enable\ninput sliders for\nentry fields'
    );
    if (MorphicPreferences.useSliderForInput) {
        addPreference(
            'Execute on slider change',
            'toggleSliderExecute',
            ArgMorph.prototype.executeOnSliderEdit,
            'uncheck to suppress\nrunning scripts\nwhen moving the slider',
            'check to run\nthe edited script\nwhen moving the slider'
        );
    }
    addPreference(
        'Turbo mode',
        'toggleFastTracking',
        this.stage.isFastTracked,
        'uncheck to run scripts\nat normal speed',
        'check to prioritize\nscript execution'
    );
    addPreference(
        'Visible stepping',
        'toggleSingleStepping',
        Process.prototype.enableSingleStepping,
        'uncheck to turn off\nvisible stepping',
        'check to turn on\n visible stepping (slow)',
        false
    );
    addPreference(
        'Ternary Boolean slots',
        function () {
        	BooleanSlotMorph.prototype.isTernary =
        		!BooleanSlotMorph.prototype.isTernary;
      	},
        BooleanSlotMorph.prototype.isTernary,
        'uncheck to limit\nBoolean slots to true / false',
        'check to allow\nempty Boolean slots',
        true
    );
    addPreference(
        'Camera support',
        'toggleCameraSupport',
        CamSnapshotDialogMorph.prototype.enableCamera,
        'uncheck to disable\ncamera support',
        'check to enable\ncamera support',
        true
    );
    menu.addLine(); // everything visible below is persistent
    addPreference(
        'Blurred shadows',
        'toggleBlurredShadows',
        useBlurredShadows,
        'uncheck to use solid drop\nshadows and highlights',
        'check to use blurred drop\nshadows and highlights',
        true
    );
    addPreference(
        'Zebra coloring',
        'toggleZebraColoring',
        BlockMorph.prototype.zebraContrast,
        'uncheck to disable alternating\ncolors for nested block',
        'check to enable alternating\ncolors for nested blocks',
        true
    );
    addPreference(
        'Dynamic input labels',
        'toggleDynamicInputLabels',
        SyntaxElementMorph.prototype.dynamicInputLabels,
        'uncheck to disable dynamic\nlabels for variadic inputs',
        'check to enable dynamic\nlabels for variadic inputs',
        true
    );
    addPreference(
        'Prefer empty slot drops',
        'togglePreferEmptySlotDrops',
        ScriptsMorph.prototype.isPreferringEmptySlots,
        'uncheck to allow dropped\nreporters to kick out others',
        'settings menu prefer empty slots hint',
        true
    );
    addPreference(
        'Long form input dialog',
        'toggleLongFormInputDialog',
        InputSlotDialogMorph.prototype.isLaunchingExpanded,
        'uncheck to use the input\ndialog in short form',
        'check to always show slot\ntypes in the input dialog'
    );
    addPreference(
        'Plain prototype labels',
        'togglePlainPrototypeLabels',
        BlockLabelPlaceHolderMorph.prototype.plainLabel,
        'uncheck to always show (+) symbols\nin block prototype labels',
        'check to hide (+) symbols\nin block prototype labels'
    );
    addPreference(
        'Virtual keyboard',
        'toggleVirtualKeyboard',
        MorphicPreferences.useVirtualKeyboard,
        'uncheck to disable\nvirtual keyboard support\nfor mobile devices',
        'check to enable\nvirtual keyboard support\nfor mobile devices',
        true
    );
    addPreference(
        'Clicking sound',
        function () {
            BlockMorph.prototype.toggleSnapSound();
            if (BlockMorph.prototype.snapSound) {
                myself.saveSetting('click', true);
            } else {
                myself.removeSetting('click');
            }
        },
        BlockMorph.prototype.snapSound,
        'uncheck to turn\nblock clicking\nsound off',
        'check to turn\nblock clicking\nsound on'
    );
    addPreference(
        'Animations',
        function () {myself.isAnimating = !myself.isAnimating; },
        myself.isAnimating,
        'uncheck to disable\nIDE animations',
        'check to enable\nIDE animations',
        true
    );
    addPreference(
        'Cache Inputs',
        function () {
            BlockMorph.prototype.isCachingInputs =
                !BlockMorph.prototype.isCachingInputs;
        },
        BlockMorph.prototype.isCachingInputs,
        'uncheck to stop caching\ninputs (for debugging the evaluator)',
        'check to cache inputs\nboosts recursion',
        true
    );
    addPreference(
        'Rasterize SVGs',
        function () {
            MorphicPreferences.rasterizeSVGs =
                !MorphicPreferences.rasterizeSVGs;
        },
        MorphicPreferences.rasterizeSVGs,
        'uncheck for smooth\nscaling of vector costumes',
        'check to rasterize\nSVGs on import',
        true
    );
    addPreference(
        'Flat design',
        function () {
            if (MorphicPreferences.isFlat) {
                return myself.defaultDesign();
            }
            myself.flatDesign();
        },
        MorphicPreferences.isFlat,
        'uncheck for default\nGUI design',
        'check for alternative\nGUI design',
        false
    );
    addPreference(
        'Nested auto-wrapping',
        function () {
            ScriptsMorph.prototype.enableNestedAutoWrapping =
                !ScriptsMorph.prototype.enableNestedAutoWrapping;
            if (ScriptsMorph.prototype.enableNestedAutoWrapping) {
                myself.removeSetting('autowrapping');
            } else {
                myself.saveSetting('autowrapping', false);
            }
        },
        ScriptsMorph.prototype.enableNestedAutoWrapping,
        'uncheck to confine auto-wrapping\nto top-level block stacks',
        'check to enable auto-wrapping\ninside nested block stacks',
        true
    );
    addPreference(
        'Project URLs',
        function () {
            myself.projectsInURLs = !myself.projectsInURLs;
            if (myself.projectsInURLs) {
                myself.saveSetting('longurls', true);
            } else {
                myself.removeSetting('longurls');
            }
        },
        myself.projectsInURLs,
        'uncheck to disable\nproject data in URLs',
        'check to enable\nproject data in URLs',
        true
    );
    addPreference(
        'Sprite Nesting',
        function () {
            SpriteMorph.prototype.enableNesting =
                !SpriteMorph.prototype.enableNesting;
        },
        SpriteMorph.prototype.enableNesting,
        'uncheck to disable\nsprite composition',
        'check to enable\nsprite composition',
        true
    );
    addPreference(
        'First-Class Sprites',
        function () {
            SpriteMorph.prototype.enableFirstClass =
                !SpriteMorph.prototype.enableFirstClass;
            myself.currentSprite.blocksCache.sensing = null;
            myself.currentSprite.paletteCache.sensing = null;
            myself.refreshPalette();
        },
        SpriteMorph.prototype.enableFirstClass,
        'uncheck to disable support\nfor first-class sprites',
        'check to enable support\n for first-class sprite',
        true
    );
    addPreference(
        'Keyboard Editing',
        function () {
            ScriptsMorph.prototype.enableKeyboard =
                !ScriptsMorph.prototype.enableKeyboard;
            myself.currentSprite.scripts.updateToolbar();
            if (ScriptsMorph.prototype.enableKeyboard) {
                myself.removeSetting('keyboard');
            } else {
                myself.saveSetting('keyboard', false);
            }
        },
        ScriptsMorph.prototype.enableKeyboard,
        'uncheck to disable\nkeyboard editing support',
        'check to enable\nkeyboard editing support',
        true
    );
    addPreference(
        'Table support',
        function () {
            List.prototype.enableTables =
                !List.prototype.enableTables;
            if (List.prototype.enableTables) {
                myself.removeSetting('tables');
            } else {
                myself.saveSetting('tables', false);
            }
        },
        List.prototype.enableTables,
        'uncheck to disable\nmulti-column list views',
        'check for multi-column\nlist view support',
        true
    );
    if (List.prototype.enableTables) {
        addPreference(
            'Table lines',
            function () {
                TableMorph.prototype.highContrast =
                    !TableMorph.prototype.highContrast;
                if (TableMorph.prototype.highContrast) {
                    myself.saveSetting('tableLines', true);
                } else {
                    myself.removeSetting('tableLines');
                }
            },
            TableMorph.prototype.highContrast,
            'uncheck for less contrast\nmulti-column list views',
            'check for higher contrast\ntable views',
            true
        );
    }
    addPreference(
        'Live coding support',
        function () {
            Process.prototype.enableLiveCoding =
                !Process.prototype.enableLiveCoding;
        },
        Process.prototype.enableLiveCoding,
        'EXPERIMENTAL! uncheck to disable live\ncustom control structures',
        'EXPERIMENTAL! check to enable\n live custom control structures',
        true
    );
    menu.addLine(); // everything below this line is stored in the project
    addPreference(
        'Thread safe scripts',
        function () {stage.isThreadSafe = !stage.isThreadSafe; },
        this.stage.isThreadSafe,
        'uncheck to allow\nscript reentrance',
        'check to disallow\nscript reentrance'
    );
    addPreference(
        'Fullscreen mode',
        function () {stage.enableFullScreen = !stage.enableFullScreen; },
        this.stage.enableFullScreen,
        'check to allow\nfullscreen mode',
        'uncheck to disallow\nfullscreen mode'
    );      
    addPreference(
        'Prefer smooth animations',
        'toggleVariableFrameRate',
        StageMorph.prototype.frameRate,
        'uncheck for greater speed\nat variable frame rates',
        'check for smooth, predictable\nanimations across computers',
        true
    );
    addPreference(
        'Flat line ends',
        function () {
            SpriteMorph.prototype.useFlatLineEnds =
                !SpriteMorph.prototype.useFlatLineEnds;
        },
        SpriteMorph.prototype.useFlatLineEnds,
        'uncheck for round ends of lines',
        'check for flat ends of lines'
    );
    addPreference(
        'Codification support',
        function () {
            StageMorph.prototype.enableCodeMapping =
                !StageMorph.prototype.enableCodeMapping;
            myself.currentSprite.blocksCache.variables = null;
            myself.currentSprite.paletteCache.variables = null;
            myself.refreshPalette();
        },
        StageMorph.prototype.enableCodeMapping,
        'uncheck to disable\nblock to text mapping features',
        'check for block\nto text mapping features',
        false
    );
    addPreference(
        'Inheritance support',
        function () {
            StageMorph.prototype.enableInheritance =
                !StageMorph.prototype.enableInheritance;
            myself.currentSprite.blocksCache.variables = null;
            myself.currentSprite.paletteCache.variables = null;
            myself.refreshPalette();
        },
        StageMorph.prototype.enableInheritance,
        'uncheck to disable\nsprite inheritance features',
        'check for sprite\ninheritance features',
        false
    );
    addPreference(
        'Persist linked sublist IDs',
        function () {
            StageMorph.prototype.enableSublistIDs =
                !StageMorph.prototype.enableSublistIDs;
        },
        StageMorph.prototype.enableSublistIDs,
        'uncheck to disable\nsaving linked sublist identities',
        'check to enable\nsaving linked sublist identities',
        true
    );
    menu.popup(world, pos);
};

IDE_Morph.prototype.toggleAppMode = function (appMode) {
    var world = this.world(),
        elements = [
            this.logo,
            this.controlBar.cloudButton,
            this.controlBar.projectButton,
            this.controlBar.settingsButton,
            this.controlBar.steppingButton,
            this.controlBar.stageSizeButton,
            this.paletteHandle,
            this.stageHandle,
            this.corral,
            this.corralBar,
            this.spriteEditor,
            this.spriteBar,
            this.palette,
            this.categories
        ];

    this.isAppMode = isNil(appMode) ? !this.isAppMode : appMode;

    Morph.prototype.trackChanges = false;
    if (this.isAppMode) {
		this.wasSingleStepping = Process.prototype.enableSingleStepping;
		if (this.wasSingleStepping) {
     		this.toggleSingleStepping();
    	}
        this.setColor(this.appModeColor);
        this.controlBar.setColor(this.color);
        this.controlBar.appModeButton.refresh();
        elements.forEach(function (e) {
            e.hide();
        });
        world.children.forEach(function (morph) {
            if (morph instanceof DialogBoxMorph) {
                morph.hide();
            }
        });
        if (world.keyboardReceiver instanceof ScriptFocusMorph) {
            world.keyboardReceiver.stopEditing();
        }
    } else {
        if (this.wasSingleStepping && !Process.prototype.enableSingleStepping) {
             this.toggleSingleStepping();
        }
        this.setColor(this.backgroundColor);
        this.controlBar.setColor(this.frameColor);
        elements.forEach(function (e) {
            e.show();
        });
       	if (this.stage.enableFullScreen){ 
        	  this.stage.resetExtent(new Point(480,360));
       	}        
        this.stage.setScale(1);
        // show all hidden dialogs
        world.children.forEach(function (morph) {
            if (morph instanceof DialogBoxMorph) {
                morph.show();
            }
        });
        // prevent scrollbars from showing when morph appears
        world.allChildren().filter(function (c) {
            return c instanceof ScrollFrameMorph;
        }).forEach(function (s) {
            s.adjustScrollBars();
        });
        // prevent rotation and draggability controls from
        // showing for the stage
        if (this.currentSprite === this.stage) {
            this.spriteBar.children.forEach(function (child) {
                if (child instanceof PushButtonMorph) {
                    child.hide();
                }
            });
        }
        // update undrop controls
        this.currentSprite.scripts.updateToolbar();
    }
    this.setExtent(this.world().extent()); // resume trackChanges
};


SpriteMorph.prototype.categories =
    [
        'motion',
        'control',
        'looks',
        'sensing',
        'sound',
        'operators',
        'pen',
        'variables',
        'robot',
//        'social',
        'lists',
        'other'
    ];

SpriteMorph.prototype.blockColor = {
    motion : new Color(74, 108, 212),
    looks : new Color(143, 86, 227),
    sound : new Color(207, 74, 217),
    pen : new Color(0, 161, 120),
    control : new Color(230, 168, 34),
    sensing : new Color(4, 148, 220),
    operators : new Color(98, 194, 19),
    variables : new Color(243, 118, 29),
    robot : new Color(120, 120, 120),
//    social : new Color(230, 60, 60),    
    lists : new Color(217, 77, 17),
    other: new Color(150, 150, 150)
};


SpriteMorph.prototype.initBlocks = function () {
    SpriteMorph.prototype.blocks = {

        // Motion
        forward: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'move %n steps',
            defaults: [10]
        },
        turn: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'turn %clockwise %n degrees',
            defaults: [15]
        },
        turnLeft: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'turn %counterclockwise %n degrees',
            defaults: [15]
        },
        setHeading: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'point in direction %dir'
        },
        doFaceTowards: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'point towards %dst'
        },
        gotoXY: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'go to x: %n y: %n',
            defaults: [0, 0]
        },
        doGotoObject: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'go to %dst'
        },
        doGlide: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'glide %n secs to x: %n y: %n',
            defaults: [1, 0, 0]
        },
        changeXPosition: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'change x by %n',
            defaults: [10]
        },
        setXPosition: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'set x to %n',
            defaults: [0]
        },
        changeYPosition: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'change y by %n',
            defaults: [10]
        },
        setYPosition: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'set y to %n',
            defaults: [0]
        },
        bounceOffEdge: {
            only: SpriteMorph,
            type: 'command',
            category: 'motion',
            spec: 'if on edge, bounce'
        },
        xPosition: {
            only: SpriteMorph,
            type: 'reporter',
            category: 'motion',
            spec: 'x position'
        },
        yPosition: {
            only: SpriteMorph,
            type: 'reporter',
            category: 'motion',
            spec: 'y position'
        },
        direction: {
            only: SpriteMorph,
            type: 'reporter',
            category: 'motion',
            spec: 'direction'
        },

        // Looks
        doSwitchToCostume: {
            type: 'command',
            category: 'looks',
            spec: 'switch to costume %cst'
        },
        doWearNextCostume: {
            type: 'command',
            category: 'looks',
            spec: 'next costume'
        },
        getCostumeIdx: {
            type: 'reporter',
            category: 'looks',
            spec: 'costume #'
        },
        doSayFor: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'say %s for %n secs',
            defaults: [localize('Hello!'), 2]
        },
        bubble: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'say %s',
            defaults: [localize('Hello!')]
        },
        doThinkFor: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'think %s for %n secs',
            defaults: [localize('Hmm...'), 2]
        },
        doThink: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'think %s',
            defaults: [localize('Hmm...')]
        },
        changeEffect: {
            type: 'command',
            category: 'looks',
            spec: 'change %eff effect by %n',
            defaults: [null, 25]
        },
        setEffect: {
            type: 'command',
            category: 'looks',
            spec: 'set %eff effect to %n',
            defaults: [null, 0]
        },
        setAlternativeColor: {
            type: 'command',
            category: 'looks',
            spec: 'change color to R %n G %n B %n',
            defaults: [0, 0, 0]
        },  
        setAlternativeColorHSV: {
            type: 'command',
            category: 'looks',
            spec: 'change color to H %n S %n V %n',
            defaults: [0.3, 0.7, 0.6]
        },          
        clearEffects: {
            type: 'command',
            category: 'looks',
            spec: 'clear graphic effects'
        },
        changeScale: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'change size by %n',
            defaults: [10]
        },
        setScale: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'set size to %n %',
            defaults: [100]
        },
        getScale: {
            only: SpriteMorph,
            type: 'reporter',
            category: 'looks',
            spec: 'size'
        },
        show: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'show'
        },
        hide: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'hide'
        },
        comeToFront: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'go to front'
        },
        goBack: {
            only: SpriteMorph,
            type: 'command',
            category: 'looks',
            spec: 'go back %n layers',
            defaults: [1]
        },
        doScreenshot: {
            type: 'command',
            category: 'looks',
            spec: 'save %imgsource as costume named %s',
            defaults: [['pen trails'], localize('screenshot')]
        },

        // Looks - Debugging primitives for development mode
        reportCostumes: {
            dev: true,
            type: 'reporter',
            category: 'looks',
            spec: 'wardrobe'
        },

        alert: {
            dev: true,
            type: 'command',
            category: 'looks',
            spec: 'alert %mult%s'
        },
        log: {
            dev: true,
            type: 'command',
            category: 'looks',
            spec: 'console log %mult%s'
        },

        // Sound
        playSound: {
            type: 'command',
            category: 'sound',
            spec: 'play sound %snd'
        },
        doPlaySoundUntilDone: {
            type: 'command',
            category: 'sound',
            spec: 'play sound %snd until done'
        },
        doStopAllSounds: {
            type: 'command',
            category: 'sound',
            spec: 'stop all sounds'
        },
        doRest: {
            type: 'command',
            category: 'sound',
            spec: 'rest for %n beats',
            defaults: [0.2]
        },
        doPlayNote: {
            type: 'command',
            category: 'sound',
            spec: 'play note %note for %n beats',
            defaults: [60, 0.5]
        },
        doSetInstrument: {
            type: 'command',
            category: 'sound',
            spec: 'set instrument to %inst',
            defaults: [1]
        },
        doChangeTempo: {
            type: 'command',
            category: 'sound',
            spec: 'change tempo by %n',
            defaults: [20]
        },
        doSetTempo: {
            type: 'command',
            category: 'sound',
            spec: 'set tempo to %n bpm',
            defaults: [60]
        },
        getTempo: {
            type: 'reporter',
            category: 'sound',
            spec: 'tempo'
        },

        // Sound - Debugging primitives for development mode
        reportSounds: {
            dev: true,
            type: 'reporter',
            category: 'sound',
            spec: 'jukebox'
        },

        // Pen
        clear: {
            type: 'command',
            category: 'pen',
            spec: 'clear'
        },
        down: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'pen down'
        },
        up: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'pen up'
        },
        setColor: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'set pen color to %clr'
        },
        changeHue: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'change pen color by %n',
            defaults: [10]
        },
        setHue: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'set pen color to %n',
            defaults: [0]
        },
        changeBrightness: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'change pen shade by %n',
            defaults: [10]
        },
        setBrightness: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'set pen shade to %n',
            defaults: [100]
        },
        changeSize: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'change pen size by %n',
            defaults: [1]
        },
        setSize: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'set pen size to %n',
            defaults: [1]
        },
        doStamp: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'stamp'
        },
        floodFill: {
            only: SpriteMorph,
            type: 'command',
            category: 'pen',
            spec: 'fill'
        },
        reportPenTrailsAsCostume: {
            type: 'reporter',
            category: 'pen',
            spec: 'pen trails'
        },
        // Control
        receiveGo: {
            type: 'hat',
            category: 'control',
            spec: 'when %greenflag clicked'
        },
        receiveKey: {
            type: 'hat',
            category: 'control',
            spec: 'when %keyHat key pressed'
        },
        receiveInteraction: {
            type: 'hat',
            category: 'control',
            spec: 'when I am %interaction',
            defaults: ['clicked']
        },
        receiveMessage: {
            type: 'hat',
            category: 'control',
            spec: 'when I receive %msgHat'
        },
        receiveCondition: {
            type: 'hat',
            category: 'control',
            spec: 'when %b'
        },
        doBroadcast: {
            type: 'command',
            category: 'control',
            spec: 'broadcast %msg'
        },
        doBroadcastAndWait: {
            type: 'command',
            category: 'control',
            spec: 'broadcast %msg and wait'
        },
        getLastMessage: {
            type: 'reporter',
            category: 'control',
            spec: 'message'
        },
        doWait: {
            type: 'command',
            category: 'control',
            spec: 'wait %n secs',
            defaults: [1]
        },
        doWaitUntil: {
            type: 'command',
            category: 'control',
            spec: 'wait until %b'
        },
        doForever: {
            type: 'command',
            category: 'control',
            spec: 'forever %c'
        },
        doRepeat: {
            type: 'command',
            category: 'control',
            spec: 'repeat %n %c',
            defaults: [10]
        },
        doUntil: {
            type: 'command',
            category: 'control',
            spec: 'repeat until %b %c'
        },
        doIf: {
            type: 'command',
            category: 'control',
            spec: 'if %b %c'
        },
        doIfElse: {
            type: 'command',
            category: 'control',
            spec: 'if %b %c else %c'
        },

    /* migrated to a newer block version:

        doStop: {
            type: 'command',
            category: 'control',
            spec: 'stop script'
        },
        doStopAll: {
            type: 'command',
            category: 'control',
            spec: 'stop all %stop'
        },
    */

        doStopThis: {
            type: 'command',
            category: 'control',
            spec: 'stop %stopChoices'
        },

    /* migrated to doStopThis:

        doStopOthers: {
            type: 'command',
            category: 'control',
            spec: 'stop %stopOthersChoices'
        },
    */

        doRun: {
            type: 'command',
            category: 'control',
            spec: 'run %cmdRing %inputs'
        },
        fork: {
            type: 'command',
            category: 'control',
            spec: 'launch %cmdRing %inputs'
        },
        evaluate: {
            type: 'reporter',
            category: 'control',
            spec: 'call %repRing %inputs'
        },
        doReport: {
            type: 'command',
            category: 'control',
            spec: 'report %s'
        },
    /*
        doStopBlock: { // migrated to a newer block version
            type: 'command',
            category: 'control',
            spec: 'stop block'
        },
    */
        doCallCC: {
            type: 'command',
            category: 'control',
            spec: 'run %cmdRing w/continuation'
        },
        reportCallCC: {
            type: 'reporter',
            category: 'control',
            spec: 'call %cmdRing w/continuation'
        },
        doWarp: {
            type: 'command',
            category: 'other',
            spec: 'warp %c'
        },

        // Message passing - very experimental

        doTellTo: {
            type: 'command',
            category: 'control',
            // spec: 'tell %spr to %cl' // I liked this version much better, -Jens
            spec: 'tell %spr to %cmdRing %inputs'
        },
        reportAskFor: {
            type: 'reporter',
            category: 'control',
            spec: 'ask %spr for %repRing %inputs'
        },

        // Cloning

        receiveOnClone: {
            type: 'hat',
            category: 'control',
            spec: 'when I start as a clone'
        },
        createClone: {
            type: 'command',
            category: 'control',
            spec: 'create a clone of %cln'
        },
        newClone: {
            type: 'reporter',
            category: 'control',
            spec: 'a new clone of %cln',
            defaults: [['myself']]
        },
        removeClone: {
            type: 'command',
            category: 'control',
            spec: 'delete this clone'
        },

        // Debugging - pausing

        doPauseAll: {
            type: 'command',
            category: 'control',
            spec: 'pause all %pause'
        },

        // Sensing

        reportTouchingObject: {
            only: SpriteMorph,
            type: 'predicate',
            category: 'sensing',
            spec: 'touching %col ?'
        },
        reportTouchingColor: {
            only: SpriteMorph,
            type: 'predicate',
            category: 'sensing',
            spec: 'touching %clr ?'
        },
        reportColorIsTouchingColor: {
            only: SpriteMorph,
            type: 'predicate',
            category: 'sensing',
            spec: 'color %clr is touching %clr ?'
        },
        colorFiltered: {
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'filtered for %clr'
        },
        reportStackSize: {
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'stack size'
        },
        reportFrameCount: {
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'frames'
        },
        reportThreadCount: {
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'processes'
        },
        doAsk: {
            type: 'command',
            category: 'sensing',
            spec: 'ask %s and wait',
            defaults: [localize('what\'s your name?')]
        },
        reportLastAnswer: { // retained for legacy compatibility
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'answer'
        },
        getLastAnswer: {
            type: 'reporter',
            category: 'sensing',
            spec: 'answer'
        },
        reportMouseX: {
            type: 'reporter',
            category: 'sensing',
            spec: 'mouse x'
        },
        reportMouseY: {
            type: 'reporter',
            category: 'sensing',
            spec: 'mouse y'
        },
        reportMouseDown: {
            type: 'predicate',
            category: 'sensing',
            spec: 'mouse down?'
        },
        reportKeyPressed: {
            type: 'predicate',
            category: 'sensing',
            spec: 'key %key pressed?'
        },
    /*
        reportDistanceTo: { // has been superseded by reportRelationTo
            type: 'reporter',
            category: 'sensing',
            spec: 'distance to %dst'
        },
    */
        reportRelationTo: {
            only: SpriteMorph,
            type: 'reporter',
            category: 'sensing',
            spec: '%rel to %dst',
            defaults: [['distance']]
        },
        doResetTimer: {
            type: 'command',
            category: 'sensing',
            spec: 'reset timer'
        },
        reportTimer: { // retained for legacy compatibility
            dev: true,
            type: 'reporter',
            category: 'sensing',
            spec: 'timer'
        },
        getTimer: {
            type: 'reporter',
            category: 'sensing',
            spec: 'timer'
        },
        reportAttributeOf: {
            type: 'reporter',
            category: 'sensing',
            spec: '%att of %spr',
            defaults: [['costume #']]
        },
        reportURL: {
            type: 'reporter',
            category: 'sensing',
            spec: 'url %s',
            defaults: ['snap.berkeley.edu']
        },
        reportIsFastTracking: {
            type: 'predicate',
            category: 'sensing',
            spec: 'turbo mode?'
        },
        doSetFastTracking: {
            type: 'command',
            category: 'sensing',
            spec: 'set turbo mode to %b'
        },
        reportDate: {
            type: 'reporter',
            category: 'sensing',
            spec: 'current %dates'
        },
        reportGet: {
            type: 'reporter',
            category: 'sensing',
            spec: 'my %get',
            defaults: [['neighbors']]
        },

        // Operators
        reifyScript: {
            type: 'ring',
            category: 'other',
            spec: '%rc %ringparms',
            alias: 'command ring lambda'
        },
        reifyReporter: {
            type: 'ring',
            category: 'other',
            spec: '%rr %ringparms',
            alias: 'reporter ring lambda'
        },
        reifyPredicate: {
            type: 'ring',
            category: 'other',
            spec: '%rp %ringparms',
            alias: 'predicate ring lambda'
        },
        reportSum: {
            type: 'reporter',
            category: 'operators',
            spec: '%n + %n'
        },
        reportDifference: {
            type: 'reporter',
            category: 'operators',
            spec: '%n \u2212 %n',
            alias: '-'
        },
        reportProduct: {
            type: 'reporter',
            category: 'operators',
            spec: '%n \u00D7 %n',
            alias: '*'
        },
        reportQuotient: {
            type: 'reporter',
            category: 'operators',
            spec: '%n / %n' // '%n \u00F7 %n'
        },
        reportRound: {
            type: 'reporter',
            category: 'operators',
            spec: 'round %n'
        },
        reportMonadic: {
            type: 'reporter',
            category: 'operators',
            spec: '%fun of %n',
            defaults: [null, 10]
        },
        reportModulus: {
            type: 'reporter',
            category: 'operators',
            spec: '%n mod %n'
        },
        reportRandom: {
            type: 'reporter',
            category: 'operators',
            spec: 'pick random %n to %n',
            defaults: [1, 10]
        },
        reportLessThan: {
            type: 'predicate',
            category: 'operators',
            spec: '%s < %s'
        },
        reportEquals: {
            type: 'predicate',
            category: 'operators',
            spec: '%s = %s'
        },
        reportGreaterThan: {
            type: 'predicate',
            category: 'operators',
            spec: '%s > %s'
        },
        reportAnd: {
            type: 'predicate',
            category: 'operators',
            spec: '%b and %b'
        },
        reportOr: {
            type: 'predicate',
            category: 'operators',
            spec: '%b or %b'
        },
        reportNot: {
            type: 'predicate',
            category: 'operators',
            spec: 'not %b'
        },
        reportBoolean: {
            type: 'predicate',
            category: 'operators',
            spec: '%bool',
            alias: 'true boolean'
        },
        reportFalse: { // special case for keyboard entry and search
            type: 'predicate',
            category: 'operators',
            spec: '%bool',
            defaults: [false],
            alias: 'false boolean'
        },
        reportJoinWords: {
            type: 'reporter',
            category: 'operators',
            spec: 'join %words',
            defaults: [localize('hello') + ' ', localize('world')]
        },
        reportLetter: {
            type: 'reporter',
            category: 'operators',
            spec: 'letter %idx of %s',
            defaults: [1, localize('world')]
        },
        reportStringSize: {
            type: 'reporter',
            category: 'operators',
            spec: 'length of %s',
            defaults: [localize('world')]
        },
        reportUnicode: {
            type: 'reporter',
            category: 'operators',
            spec: 'unicode of %s',
            defaults: ['a']
        },
        reportUnicodeAsLetter: {
            type: 'reporter',
            category: 'operators',
            spec: 'unicode %n as letter',
            defaults: [65]
        },
        reportIsA: {
            type: 'predicate',
            category: 'operators',
            spec: 'is %s a %typ ?',
            defaults: [5]
        },
        reportIsIdentical: {
            type: 'predicate',
            category: 'operators',
            spec: 'is %s identical to %s ?'
        },
        reportTextSplit: {
            type: 'reporter',
            category: 'operators',
            spec: 'split %s by %delim',
            defaults: [localize('hello') + ' ' + localize('world'), " "]
        },
        reportJSFunction: { // experimental
            type: 'reporter',
            category: 'operators',
            spec: 'JavaScript function ( %mult%s ) { %code }'
        },
        reportTypeOf: { // only in dev mode for debugging
            dev: true,
            type: 'reporter',
            category: 'operators',
            spec: 'type of %s',
            defaults: [5]
        },
        reportTextFunction: { // only in dev mode - experimental
            dev: true,
            type: 'reporter',
            category: 'operators',
            spec: '%txtfun of %s',
            defaults: [null, "Abelson & Sussman"]
        },
        reportCompiled: { // experimental
            type: 'reporter',
            category: 'operators',
            spec: 'compile %repRing for %n args',
            defaults: [null, 0]
        },

    /*
        reportScript: {
            type: 'reporter',
            category: 'operators',
            spec: 'the script %parms %c'
        },
        reify: {
            type: 'reporter',
            category: 'operators',
            spec: 'the %f block %parms'
        },
    */

        // Variables
        doSetVar: {
            type: 'command',
            category: 'variables',
            spec: 'set %var to %s',
            defaults: [null, 0]
        },
        doChangeVar: {
            type: 'command',
            category: 'variables',
            spec: 'change %var by %n',
            defaults: [null, 1]
        },
        doShowVar: {
            type: 'command',
            category: 'variables',
            spec: 'show variable %var'
        },
        doHideVar: {
            type: 'command',
            category: 'variables',
            spec: 'hide variable %var'
        },
        doDeclareVariables: {
            type: 'command',
            category: 'other',
            spec: 'script variables %scriptVars'
        },

        // inheritance - experimental
        doDeleteAttr: {
            type: 'command',
            category: 'variables',
            spec: 'inherit %shd'
        },

        // Lists
        reportNewList: {
            type: 'reporter',
            category: 'lists',
            spec: 'list %exp'
        },
        reportCONS: {
            type: 'reporter',
            category: 'lists',
            spec: '%s in front of %l'
        },
        reportListItem: {
            type: 'reporter',
            category: 'lists',
            spec: 'item %idx of %l',
            defaults: [1]
        },
        reportCDR: {
            type: 'reporter',
            category: 'lists',
            spec: 'all but first of %l'
        },
        reportListLength: {
            type: 'reporter',
            category: 'lists',
            spec: 'length of %l'
        },
        reportListContainsItem: {
            type: 'predicate',
            category: 'lists',
            spec: '%l contains %s',
            defaults: [null, localize('thing')]
        },
        doAddToList: {
            type: 'command',
            category: 'lists',
            spec: 'add %s to %l',
            defaults: [localize('thing')]
        },
        doDeleteFromList: {
            type: 'command',
            category: 'lists',
            spec: 'delete %ida of %l',
            defaults: [1]
        },
        doInsertInList: {
            type: 'command',
            category: 'lists',
            spec: 'insert %s at %idx of %l',
            defaults: [localize('thing'), 1]
        },
        doReplaceInList: {
            type: 'command',
            category: 'lists',
            spec: 'replace item %idx of %l with %s',
            defaults: [1, null, localize('thing')]
        },

        // MAP - experimental
        reportMap: {
            dev: true,
            type: 'reporter',
            category: 'lists',
            spec: 'map %repRing over %l'
        },
        doForEach: {
            dev: true,
            type: 'command',
            category: 'lists',
            spec: 'for %upvar in %l %cl',
            defaults: [localize('each item')]
        },

        // Tables - experimental

        doShowTable: {
            dev: true,
            type: 'command',
            category: 'lists',
            spec: 'show table %l'
        },

        // Code mapping - experimental
        doMapCodeOrHeader: { // experimental
            type: 'command',
            category: 'other',
            spec: 'map %cmdRing to %codeKind %code'
        },
        doMapValueCode: { // experimental
            type: 'command',
            category: 'other',
            spec: 'map %mapValue to code %code',
            defaults: [['String'], '<#1>']
        },
    /* obsolete - superseded by 'doMapValue'
        doMapStringCode: { // experimental
            type: 'command',
            category: 'other',
            spec: 'map String to code %code',
            defaults: ['<#1>']
        },
    */
        doMapListCode: { // experimental
            type: 'command',
            category: 'other',
            spec: 'map %codeListPart of %codeListKind to code %code'
        },
        reportMappedCode: { // experimental
            type: 'reporter',
            category: 'other',
            spec: 'code of %cmdRing'
        },
        
        connectToSnapRobot: { //experimental
        		type: 'command',
        		category: 'robot',
        		spec: 'connect to SnapRobot IP address %s',
        		defaults: ['127.0.0.1']
        },
        
        callSnapRobot: { //experimental
        		type: 'command',
        		category: 'robot',
        		spec: 'runCommand %l'
        },        

        reportSnapRobot: { //experimental
        		type: 'reporter',
        		category: 'robot',
        		spec: 'reportSensor %l'
        },
        
        receiveRemoteEvent: {
            type: 'hat',
            category: 'robot',
            spec: 'when got event %remoteEvent',
            defaults: ['slideLeft']
        },
        
        getLastRemoteEvent: {
            type: 'reporter',
            category: 'robot',
            spec: 'remoteEvent'
        }  
                        
    };
};

SpriteMorph.prototype.initBlocks();



SpriteMorph.prototype.org_init = SpriteMorph.prototype.init;
SpriteMorph.prototype.init = function (globals) {
    this.wsState = 0;		// websocket connection state
    this.wsDataState = 0;  // websocket data state
    this.wsQueue = new List();  // queue the access requests of the different processes 
    this.wsQueueNo = 0;    
    this.wsLastAddr = '';	
    this.lastRemoteEvent = '';
    
		this.alternativeColor = new Color(0,0,0);
		this.isColorReplaced = false;
		
		this.org_init(globals);   	
};

SpriteMorph.prototype.org_fullCopy = SpriteMorph.prototype.fullCopy;
SpriteMorph.prototype.fullCopy = function (forClone) {
	  var c = this.org_fullCopy(forClone);
    this.wsState = 0;		
    this.wsDataState = 0;  
    this.wsQueue = new List();  
    this.wsQueueNo = 0;    
    this.wsLastAddr = '';	
		this.lastRemoteEvent = '';		  
    c.isColorReplaced = this.isColorReplaced;
    c.alternativeColor = this.alternativeColor;
    return c;
}
// SpriteMorph block templates

SpriteMorph.prototype.blockTemplates = function (category) {
    var blocks = [], myself = this, varNames, button,
        cat = category || 'motion', txt,
        inheritedVars = this.inheritedVariableNames();

    function block(selector, isGhosted) {
        if (StageMorph.prototype.hiddenPrimitives[selector]) {
            return null;
        }
        var newBlock = SpriteMorph.prototype.blockForSelector(selector, true);
        newBlock.isTemplate = true;
        if (isGhosted) {newBlock.ghost(); }
        return newBlock;
    }

    function variableBlock(varName) {
        var newBlock = SpriteMorph.prototype.variableBlock(varName);
        newBlock.isDraggable = false;
        newBlock.isTemplate = true;
        if (contains(inheritedVars, varName)) {
            newBlock.ghost();
        }
        return newBlock;
    }

    function watcherToggle(selector) {
        if (StageMorph.prototype.hiddenPrimitives[selector]) {
            return null;
        }
        var info = SpriteMorph.prototype.blocks[selector];
        return new ToggleMorph(
            'checkbox',
            this,
            function () {
                myself.toggleWatcher(
                    selector,
                    localize(info.spec),
                    myself.blockColor[info.category]
                );
            },
            null,
            function () {
                return myself.showingWatcher(selector);
            },
            null
        );
    }

    function variableWatcherToggle(varName) {
        return new ToggleMorph(
            'checkbox',
            this,
            function () {
                myself.toggleVariableWatcher(varName);
            },
            null,
            function () {
                return myself.showingVariableWatcher(varName);
            },
            null
        );
    }

    function helpMenu() {
        var menu = new MenuMorph(this);
        menu.addItem('help...', 'showHelp');
        return menu;
    }

    function addVar(pair) {
        var ide;
        if (pair) {
            if (myself.isVariableNameInUse(pair[0], pair[1])) {
                myself.inform('that name is already in use');
            } else {
                ide = myself.parentThatIsA(IDE_Morph);
                myself.addVariable(pair[0], pair[1]);
                if (!myself.showingVariableWatcher(pair[0])) {
                    myself.toggleVariableWatcher(pair[0], pair[1]);
                }
                ide.flushBlocksCache('variables'); // b/c of inheritance
                ide.refreshPalette();
            }
        }
    }

    if (cat === 'motion') {

        blocks.push(block('forward'));
        blocks.push(block('turn'));
        blocks.push(block('turnLeft'));
        blocks.push('-');
        blocks.push(block('setHeading'));
        blocks.push(block('doFaceTowards'));
        blocks.push('-');
        blocks.push(block('gotoXY'));
        blocks.push(block('doGotoObject'));
        blocks.push(block('doGlide'));
        blocks.push('-');
        blocks.push(block('changeXPosition'));
        blocks.push(block('setXPosition'));
        blocks.push(block('changeYPosition'));
        blocks.push(block('setYPosition'));
        blocks.push('-');
        blocks.push(block('bounceOffEdge'));
        blocks.push('-');
        blocks.push(watcherToggle('xPosition'));
        blocks.push(block('xPosition', this.inheritsAttribute('x position')));
        blocks.push(watcherToggle('yPosition'));
        blocks.push(block('yPosition', this.inheritsAttribute('y position')));
        blocks.push(watcherToggle('direction'));
        blocks.push(block('direction', this.inheritsAttribute('direction')));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'looks') {

        blocks.push(block('doSwitchToCostume'));
        blocks.push(block('doWearNextCostume'));
        blocks.push(watcherToggle('getCostumeIdx'));
        blocks.push(block('getCostumeIdx', this.inheritsAttribute('costume #')));
        blocks.push('-');
        blocks.push(block('doSayFor'));
        blocks.push(block('bubble'));
        blocks.push(block('doThinkFor'));
        blocks.push(block('doThink'));
        blocks.push('-');
        blocks.push(block('changeEffect'));
        blocks.push(block('setEffect'));
        blocks.push(block('setAlternativeColor'));
        blocks.push(block('setAlternativeColorHSV'));        
        blocks.push(block('clearEffects'));
        blocks.push('-');
        blocks.push(block('changeScale'));
        blocks.push(block('setScale'));
        blocks.push(watcherToggle('getScale'));
        blocks.push(block('getScale', this.inheritsAttribute('size')));
        blocks.push('-');
        blocks.push(block('show'));
        blocks.push(block('hide'));
        blocks.push('-');
        blocks.push(block('comeToFront'));
        blocks.push(block('goBack'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('log'));
            blocks.push(block('alert'));
            blocks.push('-');
            blocks.push(block('doScreenshot'));
        }

    /////////////////////////////////

        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'sound') {

        blocks.push(block('playSound'));
        blocks.push(block('doPlaySoundUntilDone'));
        blocks.push(block('doStopAllSounds'));
        blocks.push('-');
        blocks.push(block('doRest'));
        blocks.push(block('doPlayNote'));
        blocks.push(block('doSetInstrument'));
        blocks.push('-');
        blocks.push(block('doChangeTempo'));
        blocks.push(block('doSetTempo'));
        blocks.push(watcherToggle('getTempo'));
        blocks.push(block('getTempo'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'pen') {

        blocks.push(block('clear'));
        blocks.push('-');
        blocks.push(block('down'));
        blocks.push(block('up'));
        blocks.push('-');
        blocks.push(block('setColor'));
        blocks.push(block('changeHue'));
        blocks.push(block('setHue'));
        blocks.push('-');
        blocks.push(block('changeBrightness'));
        blocks.push(block('setBrightness'));
        blocks.push('-');
        blocks.push(block('changeSize'));
        blocks.push(block('setSize'));
        blocks.push('-');
        blocks.push(block('doStamp'));
        blocks.push(block('floodFill'));
        blocks.push('-');
        blocks.push(block('reportPenTrailsAsCostume'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'control') {

        blocks.push(block('receiveGo'));
        blocks.push(block('receiveKey'));
        blocks.push(block('receiveInteraction'));
        blocks.push(block('receiveCondition'));
        blocks.push(block('receiveMessage'));
        blocks.push('-');
        blocks.push(block('doBroadcast'));
        blocks.push(block('doBroadcastAndWait'));
        blocks.push(watcherToggle('getLastMessage'));
        blocks.push(block('getLastMessage'));
        blocks.push('-');
        blocks.push(block('doWarp'));
        blocks.push('-');
        blocks.push(block('doWait'));
        blocks.push(block('doWaitUntil'));
        blocks.push('-');
        blocks.push(block('doForever'));
        blocks.push(block('doRepeat'));
        blocks.push(block('doUntil'));
        blocks.push('-');
        blocks.push(block('doIf'));
        blocks.push(block('doIfElse'));
        blocks.push('-');
        blocks.push(block('doReport'));
    /*
    // old STOP variants, migrated to a newer version, now redundant
        blocks.push(block('doStopBlock'));
        blocks.push(block('doStop'));
        blocks.push(block('doStopAll'));
    */
        blocks.push(block('doStopThis'));
    /*
        // migrated to doStopThis, now redundant
        blocks.push(block('doStopOthers'));
    */
        blocks.push('-');
        blocks.push(block('doRun'));
        blocks.push(block('fork'));
        blocks.push(block('evaluate'));
        blocks.push('-');
        blocks.push(block('doTellTo'));
        blocks.push(block('reportAskFor'));
        blocks.push('-');
        blocks.push(block('doCallCC'));
        blocks.push(block('reportCallCC'));
        blocks.push('-');
        blocks.push(block('receiveOnClone'));
        blocks.push(block('createClone'));
        blocks.push(block('newClone'));
        blocks.push(block('removeClone'));
        blocks.push('-');
        blocks.push(block('doPauseAll'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'sensing') {

        blocks.push(block('reportTouchingObject'));
        blocks.push(block('reportTouchingColor'));
        blocks.push(block('reportColorIsTouchingColor'));
        blocks.push('-');
        blocks.push(block('doAsk'));
        blocks.push(watcherToggle('getLastAnswer'));
        blocks.push(block('getLastAnswer'));
        blocks.push('-');
        blocks.push(watcherToggle('reportMouseX'));
        blocks.push(block('reportMouseX'));
        blocks.push(watcherToggle('reportMouseY'));
        blocks.push(block('reportMouseY'));
        blocks.push(block('reportMouseDown'));
        blocks.push('-');
        blocks.push(block('reportKeyPressed'));
        blocks.push('-');
        blocks.push(block('reportRelationTo'));
        blocks.push('-');
        blocks.push(block('doResetTimer'));
        blocks.push(watcherToggle('getTimer'));
        blocks.push(block('getTimer'));
        blocks.push('-');
        blocks.push(block('reportAttributeOf'));

        if (SpriteMorph.prototype.enableFirstClass) {
            blocks.push(block('reportGet'));
        }
        blocks.push('-');

        blocks.push(block('reportURL'));
        blocks.push('-');
        blocks.push(block('reportIsFastTracking'));
        blocks.push(block('doSetFastTracking'));
        blocks.push('-');
        blocks.push(block('reportDate'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {

            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(watcherToggle('reportThreadCount'));
            blocks.push(block('reportThreadCount'));
            blocks.push(block('colorFiltered'));
            blocks.push(block('reportStackSize'));
            blocks.push(block('reportFrameCount'));
        }

	/////////////////////////////////

		blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'operators') {

        blocks.push(block('reifyScript'));
        blocks.push(block('reifyReporter'));
        blocks.push(block('reifyPredicate'));
        blocks.push('#');
        blocks.push('-');
        blocks.push(block('reportSum'));
        blocks.push(block('reportDifference'));
        blocks.push(block('reportProduct'));
        blocks.push(block('reportQuotient'));
        blocks.push('-');
        blocks.push(block('reportModulus'));
        blocks.push(block('reportRound'));
        blocks.push(block('reportMonadic'));
        blocks.push(block('reportRandom'));
        blocks.push('-');
        blocks.push(block('reportLessThan'));
        blocks.push(block('reportEquals'));
        blocks.push(block('reportGreaterThan'));
        blocks.push('-');
        blocks.push(block('reportAnd'));
        blocks.push(block('reportOr'));
        blocks.push(block('reportNot'));
        blocks.push(block('reportBoolean'));
        blocks.push('-');
        blocks.push(block('reportJoinWords'));
        blocks.push(block('reportTextSplit'));
        blocks.push(block('reportLetter'));
        blocks.push(block('reportStringSize'));
        blocks.push('-');
        blocks.push(block('reportUnicode'));
        blocks.push(block('reportUnicodeAsLetter'));
        blocks.push('-');
        blocks.push(block('reportIsA'));
        blocks.push(block('reportIsIdentical'));

        if (true) { // (Process.prototype.enableJS) {
            blocks.push('-');
            blocks.push(block('reportJSFunction'));
            if (Process.prototype.enableCompiling) {
	            blocks.push(block('reportCompiled'));
            }
        }

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('reportTypeOf'));
            blocks.push(block('reportTextFunction'));
        }

    /////////////////////////////////

        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'variables') {

        button = new PushButtonMorph(
            null,
            function () {
                new VariableDialogMorph(
                    null,
                    addVar,
                    myself
                ).prompt(
                    'Variable name',
                    null,
                    myself.world()
                );
            },
            'Make a variable'
        );
        button.userMenu = helpMenu;
        button.selector = 'addVariable';
        button.showHelp = BlockMorph.prototype.showHelp;
        blocks.push(button);

        if (this.deletableVariableNames().length > 0) {
            button = new PushButtonMorph(
                null,
                function () {
                    var menu = new MenuMorph(
                        myself.deleteVariable,
                        null,
                        myself
                    );
                    myself.deletableVariableNames().forEach(function (name) {
                        menu.addItem(name, name);
                    });
                    menu.popUpAtHand(myself.world());
                },
                'Delete a variable'
            );
            button.userMenu = helpMenu;
            button.selector = 'deleteVariable';
            button.showHelp = BlockMorph.prototype.showHelp;
            blocks.push(button);
        }

        blocks.push('-');

        varNames = this.reachableGlobalVariableNames(true);
        if (varNames.length > 0) {
            varNames.forEach(function (name) {
                blocks.push(variableWatcherToggle(name));
                blocks.push(variableBlock(name));
            });
            blocks.push('-');
        }

        varNames = this.allLocalVariableNames(true);
        if (varNames.length > 0) {
            varNames.forEach(function (name) {
                blocks.push(variableWatcherToggle(name));
                blocks.push(variableBlock(name, true));
            });
            blocks.push('-');
        }

        blocks.push(block('doSetVar'));
        blocks.push(block('doChangeVar'));
        blocks.push(block('doShowVar'));
        blocks.push(block('doHideVar'));
        blocks.push(block('doDeclareVariables'));

    // inheritance:

        if (StageMorph.prototype.enableInheritance) {
            blocks.push('-');
            blocks.push(block('doDeleteAttr'));
        }

    ///////////////////////////////

        blocks.push('=');

        blocks.push(block('reportNewList'));
        blocks.push('-');
        blocks.push(block('reportCONS'));
        blocks.push(block('reportListItem'));
        blocks.push(block('reportCDR'));
        blocks.push('-');
        blocks.push(block('reportListLength'));
        blocks.push(block('reportListContainsItem'));
        blocks.push('-');
        blocks.push(block('doAddToList'));
        blocks.push(block('doDeleteFromList'));
        blocks.push(block('doInsertInList'));
        blocks.push(block('doReplaceInList'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('reportMap'));
            blocks.push('-');
            blocks.push(block('doForEach'));
            blocks.push(block('doShowTable'));
        }

    /////////////////////////////////

        blocks.push('=');

        if (StageMorph.prototype.enableCodeMapping) {
            blocks.push(block('doMapCodeOrHeader'));
            blocks.push(block('doMapValueCode'));
            blocks.push(block('doMapListCode'));
            blocks.push('-');
            blocks.push(block('reportMappedCode'));
            blocks.push('=');
        }

        blocks.push(this.makeBlockButton());

    } else if (cat === 'robot') {
    		blocks.push(block('connectToSnapRobot'));	
    		blocks.push(block('callSnapRobot'));	
    		blocks.push(block('reportSnapRobot'));	
    		
 
       
            button = new PushButtonMorph(
                null,
                function () {
                		var stage = myself.parentThatIsA(StageMorph),
                				ide = myself.parentThatIsA(IDE_Morph),
                				command = 'Self|Install|',
                				dict;
                				
										if (myself.wsState < 2) {
        								new DialogBoxMorph().inform(
            								'SnapRobot',
            								'SnapRobot not connected!',
            								myself.world(),
            								null
        								);
										}else{
											  if (location.hash.substr(0, 9) === '#present:'){
											  	  dict = SnapCloud.parseDict(location.hash.substr(9));
											  		command += ide.projectName + ',' + dict.Username + ',' + location;
														stage.threads.stopAllForReceiver(myself);
														myself.socket.send(command);		
        										new DialogBoxMorph().inform(
            										'SnapRobot',
            										'App installed!',
            										myself.world(),
            										null
        										);														
												}else{
        										new DialogBoxMorph().inform(
            										'SnapRobot',
            										'Please open a cloud project before install!\nIf it is just saved to cloud reopen it again.',
            										myself.world(),
            										null
        										);														
												}
										}
                },
                'install app on SnapRobot'
            );
            button.userMenu = helpMenu;
            button.selector = 'makealink';
            button.showHelp = BlockMorph.prototype.showHelp;
            blocks.push(button);
       
           	blocks.push(block('receiveRemoteEvent'));	
           	blocks.push(block('getLastRemoteEvent'));
        
    }
    return blocks;
};

SpriteMorph.prototype.getLastRemoteEvent = function () {
	  return this.lastRemoteEvent;
};

SpriteMorph.prototype.setAlternativeColor = function (r,g,b) {
		this.alternativeColor = new Color(r,g,b);
		this.isColorReplaced = true;
		this.drawNew();
};

SpriteMorph.prototype.setAlternativeColorHSV = function (h,s,v) {
		this.alternativeColor = new Color();
		this.alternativeColor.set_hsv(h,s,v);
		this.isColorReplaced = true;
		this.drawNew();
};

SpriteMorph.prototype.unsetAlternativeColor = function () {
	this.isColorReplaced = false;
};


// SpriteMorph stamping

SpriteMorph.prototype.doStamp = function () {
    var stage = this.parent,
    		trailsOffset = new Point(Math.floor((stage.penTrails().width-stage.bounds.width()/stage.scale)/2),Math.floor((stage.penTrails().height-stage.bounds.height()/stage.scale)/2)),
        context = stage.penTrails().getContext('2d'),
        isWarped = this.isWarped,
        originalAlpha = context.globalAlpha;       
         
    if (this.image.width < 1 || (this.image.height < 1)) {
        // too small to draw
        return;
    }
             
    if (isWarped) {
        this.endWarp();
    }
    context.save();
    context.scale(1 / stage.scale, 1 / stage.scale);
    context.globalAlpha = this.alpha;    
    context.drawImage(
        this.image,
        (this.left() - stage.left() + trailsOffset.x * stage.scale),
        (this.top() - stage.top() + trailsOffset.y * stage.scale)
    );
    context.globalAlpha = originalAlpha;    
    context.restore();
    this.changed();
    if (isWarped) {
        this.startWarp();
    }
    stage.cachedPenTrailsMorph = null;
};

// SpriteMorph drawing:

SpriteMorph.prototype.drawLine = function (start, dest) {
    var stagePos = this.parent.bounds.origin,
    		trailsOffset = new Point(Math.floor((this.parent.penTrails().width-this.parent.bounds.width()/this.parent.scale)/2),Math.floor((this.parent.penTrails().height-this.parent.bounds.height()/this.parent.scale)/2)),
        stageScale = this.parent.scale,
        context = this.parent.penTrails().getContext('2d'),
        from = start.subtract(stagePos).divideBy(stageScale).add(trailsOffset),
        to = dest.subtract(stagePos).divideBy(stageScale).add(trailsOffset),
        damagedFrom = from.subtract(trailsOffset).multiplyBy(stageScale).add(stagePos),
        damagedTo = to.subtract(trailsOffset).multiplyBy(stageScale).add(stagePos),
        damaged = damagedFrom.rectangle(damagedTo).expandBy(
            Math.max(this.size * stageScale / 2, 1)
        ).intersect(this.parent.visibleBounds()).spread();

    if (this.isDown) {
        context.lineWidth = this.size;
        context.strokeStyle = this.color.toString();
        if (this.useFlatLineEnds) {
            context.lineCap = 'butt';
            context.lineJoin = 'miter';
        } else {
            context.lineCap = 'round';
            context.lineJoin = 'round';
        }
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        if (this.isWarped === false) {
            this.world().broken.push(damaged);
        }
        this.parent.cachedPenTrailsMorph = null;
    }
};

SpriteMorph.prototype.applyGraphicsEffects = function (canvas) {
  // For every effect: apply transform of that effect(canvas, stored value)
  // Graphic effects from Scratch are heavily based on ScratchPlugin.c

    var ctx, 
    		imagedata,
    		myself = this;

    function transform_fisheye (imagedata, value) {
        var pixels, newImageData, newPixels, centerX, centerY,
            w, h, x, y, dx, dy, r, angle, srcX, srcY, i, srcI;

        w = imagedata.width;
        h = imagedata.height;
        pixels = imagedata.data;
        newImageData = ctx.createImageData(w, h);
        newPixels = newImageData.data;

        centerX = w / 2;
        centerY = h / 2;
        value = Math.max(0, (value + 100) / 100);
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                dx = (x - centerX) / centerX;
                dy = (y - centerY) / centerY;
                r = Math.pow(Math.sqrt(dx * dx + dy * dy), value);
                if (r <= 1) {
                    angle = Math.atan2(dy, dx);
                    srcX = Math.floor(
                        centerX + (r * Math.cos(angle) * centerX)
                    );
                    srcY = Math.floor(
                        centerY + (r * Math.sin(angle) * centerY)
                    );
                } else {
                    srcX = x;
                    srcY = y;
                }
                i = (y * w + x) * 4;
                srcI = (srcY * w + srcX) * 4;
                newPixels[i] = pixels[srcI];
                newPixels[i + 1] = pixels[srcI + 1];
                newPixels[i + 2] = pixels[srcI + 2];
                newPixels[i + 3] = pixels[srcI + 3];
            }
        }
        return newImageData;
    }

    function transform_whirl (imagedata, value) {
        var pixels, newImageData, newPixels, w, h, centerX, centerY,
            x, y, radius, scaleX, scaleY, whirlRadians, radiusSquared,
            dx, dy, d, factor, angle, srcX, srcY, i, srcI, sina, cosa;

        w = imagedata.width;
        h = imagedata.height;
        pixels = imagedata.data;
        newImageData = ctx.createImageData(w, h);
        newPixels = newImageData.data;

        centerX = w / 2;
        centerY = h / 2;
        radius = Math.min(centerX, centerY);
        if (w < h) {
            scaleX = h / w;
            scaleY = 1;
        } else {
            scaleX = 1;
            scaleY = w / h;
        }
        whirlRadians = -radians(value);
        radiusSquared = radius * radius;
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                dx = scaleX * (x - centerX);
                dy = scaleY * (y - centerY);
                d = dx * dx + dy * dy;
                if (d < radiusSquared) {
                    factor = 1 - (Math.sqrt(d) / radius);
                    angle = whirlRadians * (factor * factor);
                    sina = Math.sin(angle);
                    cosa = Math.cos(angle);
                    srcX = Math.floor(
                        (cosa * dx - sina * dy) / scaleX + centerX
                    );
                    srcY = Math.floor(
                        (sina * dx + cosa * dy) / scaleY + centerY
                    );
                } else {
                    srcX = x;
                    srcY = y;
                }
                i = (y * w + x) * 4;
                srcI = (srcY * w + srcX) * 4;
                newPixels[i] = pixels[srcI];
                newPixels[i + 1] = pixels[srcI + 1];
                newPixels[i + 2] = pixels[srcI + 2];
                newPixels[i + 3] = pixels[srcI + 3];
            }
        }
        return newImageData;
    }

    function transform_pixelate (imagedata, value) {
        var pixels, newImageData, newPixels, w, h,
            x, y, srcX, srcY, i, srcI;

        w = imagedata.width;
        h = imagedata.height;
        pixels = imagedata.data;
        newImageData = ctx.createImageData(w, h);
        newPixels = newImageData.data;

        value = Math.floor(Math.abs(value / 10) + 1);
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                srcX = Math.floor(x / value) * value;
                srcY = Math.floor(y / value) * value;
                i = (y * w + x) * 4;
                srcI = (srcY * w + srcX) * 4;
                newPixels[i] = pixels[srcI];
                newPixels[i + 1] = pixels[srcI + 1];
                newPixels[i + 2] = pixels[srcI + 2];
                newPixels[i + 3] = pixels[srcI + 3];
            }
        }
        return newImageData;
    }

    function transform_mosaic (imagedata, value) {
        var pixels, i, l, newImageData, newPixels, srcI;
        pixels = imagedata.data;
        newImageData = ctx.createImageData(imagedata.width, imagedata.height);
        newPixels = newImageData.data;

        value = Math.round((Math.abs(value) + 10) / 10);
        value = Math.max(
            0,
            Math.min(value, Math.min(imagedata.width, imagedata.height))
        );
        for (i = 0, l = pixels.length; i < l; i += 4) {
            srcI = i * value % l;
            newPixels[i] = pixels[srcI];
            newPixels[i + 1] = pixels[srcI + 1];
            newPixels[i + 2] = pixels[srcI + 2];
            newPixels[i + 3] = pixels[srcI + 3];
        }
        return newImageData;
    }

    function transform_duplicate (imagedata, value) {
        var pixels, i;
        pixels = imagedata.data;
        for (i = 0; i < pixels.length; i += 4) {
            pixels[i] = pixels[i * value];
            pixels[i + 1] = pixels[i * value + 1];
            pixels[i + 2] = pixels[i * value + 2];
            pixels[i + 3] = pixels[i * value + 3];
        }
        return imagedata;
    }

    function transform_HSV (
    						imagedata, 
    						hueShift, 
    						saturationShift, 
    						brightnessShift
    ) {
        var pixels, index, l, r, g, b, max, min, span,
            h, s, v, i, f, p, q, t, newR, newG, newB;
            //vLight,isLightOn = false;
        pixels = imagedata.data;
        /*
        if (myself.isVisible && myself.isALight && myself.lightParams.isLightOn) {
        		isLightOn = true;
        		vLight = Math.min(0.6,myself.lightParams.intensity/100);
        }
        */
        for (index = 0, l = pixels.length; index < l; index += 4) {
            r = pixels[index];
            g = pixels[index + 1];
            b = pixels[index + 2];

            max = Math.max(r, g, b);
            min = Math.min(r, g, b);
            span = max - min;
            if (span === 0) {
                h = s = 0;
            } else {
                if (max === r) {
                    h = (60 * (g - b)) / span;
                } else if (max === g) {
                    h = 120 + ((60 * (b - r)) / span);
                } else if (max === b) {
                    h = 240 + ((60 * (r - g)) / span);
                }
                s = (max - min) / max;
            }
            if (h < 0) {
                h += 360;
            }
            v = max / 255;

            h = (h + hueShift * 360 / 200) % 360;
            s = Math.max(0, Math.min(s + saturationShift / 100, 1));
            v = Math.max(0, Math.min(v + brightnessShift / 100, 1));
            //v = isLightOn?vLight:Math.max(0, Math.min(v + brightnessShift / 100, 1));

            i = Math.floor(h / 60);
            f = (h / 60) - i;
            p = v * (1 - s);
            q = v * (1 - (s * f));
            t = v * (1 - (s * (1 - f)));

            if (i === 0 || i === 6) {
                newR = v;
                newG = t;
                newB = p;
            } else if (i === 1) {
                newR = q;
                newG = v;
                newB = p;
            } else if (i === 2) {
                newR = p;
                newG = v;
                newB = t;
            } else if (i === 3) {
                newR = p;
                newG = q;
                newB = v;
            } else if (i === 4) {
                newR = t;
                newG = p;
                newB = v;
            } else if (i === 5) {
                newR = v;
                newG = p;
                newB = q;
            }

            pixels[index] = newR * 255;
            pixels[index + 1] = newG * 255;
            pixels[index + 2] = newB * 255;
        }
        return imagedata;
    }

    function transform_negative (imagedata, value) {
        var pixels, i, l, rcom, gcom, bcom;
        pixels = imagedata.data;
        for (i = 0, l = pixels.length; i < l; i += 4) {
            rcom = 255 - pixels[i];
            gcom = 255 - pixels[i + 1];
            bcom = 255 - pixels[i + 2];

            if (pixels[i] < rcom) { //compare to the complement
                pixels[i] += value;
            } else if (pixels[i] > rcom) {
                pixels[i] -= value;
            }
            if (pixels[i + 1] < gcom) {
                pixels[i + 1] += value;
            } else if (pixels[i + 1] > gcom) {
                pixels[i + 1] -= value;
            }
            if (pixels[i + 2] < bcom) {
                pixels[i + 2] += value;
            } else if (pixels[i + 2] > bcom) {
                pixels[i + 2] -= value;
            }
        }
        return imagedata;
    }

    function transform_comic (imagedata, value) {
        var pixels, i, l;
        pixels = imagedata.data;
        for (i = 0, l = pixels.length; i < l; i += 4) {
            pixels[i] += Math.sin(i * value) * 127 + 128;
            pixels[i + 1] += Math.sin(i * value) * 127 + 128;
            pixels[i + 2] += Math.sin(i * value) * 127 + 128;
        }
        return imagedata;
    }

    function replaceColor (imagedata, value) {
        var pixels, i, l;
        pixels = imagedata.data;
        for (i = 0, l = pixels.length; i < l; i += 4) {
            pixels[i] = value.r;
            pixels[i + 1] = value.g;
            pixels[i + 2] = value.b;
        }
        return imagedata;
    }
    		
    function transform_confetti (imagedata, value) {
        var pixels, i, l;
        pixels = imagedata.data;
        for (i = 0, l = pixels.length; i < l; i += 1) {
            pixels[i] = Math.sin(value * pixels[i]) * 127 + pixels[i];
        }
        return imagedata;
    }

    ctx = canvas.getContext("2d");
    if (canvas.width == 0 || canvas.height == 0){
    		return canvas;
    } 
    imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
 
    //if (this.graphicsChanged() || this.isColorReplaced || (this.isVisible && this.isALight && this.lightParams.isLightOn)) {
    if (this.graphicsChanged() || this.isColorReplaced) {
    
				if (this.isColorReplaced) {
						imagedata = replaceColor(imagedata,this.alternativeColor);
				}	
				/*		
				if (this.isVisible && this.isALight && this.lightParams.isLightOn) {
						imagedata = replaceColor(imagedata,this.lightParams.color);
				} 
				*/     
        if (this.graphicsValues.fisheye) {
            imagedata = transform_fisheye(imagedata, this.graphicsValues.fisheye);
        }
        if (this.graphicsValues.whirl) {
            imagedata = transform_whirl(imagedata, this.graphicsValues.whirl);
        }
        if (this.graphicsValues.pixelate) {
            imagedata = transform_pixelate(imagedata, this.graphicsValues.pixelate);
        }
        if (this.graphicsValues.mosaic) {
            imagedata = transform_mosaic(imagedata, this.graphicsValues.mosaic);
        }
        if (this.graphicsValues.duplicate) {
            imagedata = transform_duplicate(imagedata, this.graphicsValues.duplicate);
        }
        if (this.graphicsValues.color || this.graphicsValues.saturation || this.graphicsValues.brightness) {
            imagedata = transform_HSV(
                imagedata,
                this.graphicsValues.color,
                this.graphicsValues.saturation,
                this.graphicsValues.brightness
            );
        }
        if (this.graphicsValues.negative) {
            imagedata = transform_negative(imagedata, this.graphicsValues.negative);
        }
        if (this.graphicsValues.comic) {
            imagedata = transform_comic(imagedata, this.graphicsValues.comic);
        }
        if (this.graphicsValues.confetti) {
            imagedata = transform_confetti(imagedata, this.graphicsValues.confetti);
        }		
                 
    }    

		ctx.putImageData(imagedata, 0, 0);  		   
    return canvas;
};

SpriteMorph.prototype.org_clearEffects = SpriteMorph.prototype.clearEffects ;
SpriteMorph.prototype.clearEffects = function () {
    this.isColorReplaced = false;	
    this.org_clearEffects();
}
 
SpriteMorph.prototype.getWsQueueNo = function () {
		this.wsQueueNo++;
		if (this.wsQueueNo === 1024){
				this.wsQueueNo = 1;
		}
		this.wsQueue.add(this.wsQueueNo);
		return this.wsQueueNo;
};

SpriteMorph.prototype.allHatBlocksForInteraction = function (interaction) {
    return this.scripts.children.filter(function (morph) {
        if (morph.selector) {
            if (morph.selector === 'receiveInteraction') {
                return morph.inputs()[0].evaluate()[0] === interaction;
            }
            if (morph.selector === 'receiveRemoteEvent') {
                return morph.inputs()[0].evaluate()[0] === interaction || morph.inputs()[0].contents().text === interaction || morph.inputs()[0].contents().text === '';
            }            
        }
        return false;
    });
};

SpriteMorph.prototype.matchWsQueueNo = function (wsQueueNo) {
		return this.wsQueue.at(1) === wsQueueNo;
};

SpriteMorph.prototype.shiftWsQueue = function () {
		this.wsQueue.remove(1);
};

SpriteMorph.prototype.wsQueueIsEmpty = function () {
		return this.wsQueue.length() === 0;
};


SpriteMorph.prototype.gestureLeft = function () {
    return this.receiveUserInteraction('gesture-left');
};

SpriteMorph.prototype.gestureRight = function () {
    return this.receiveUserInteraction('gesture-right');
};

SpriteMorph.prototype.gestureUp = function () {
    return this.receiveUserInteraction('gesture-up');
};

SpriteMorph.prototype.gestureDown = function () {
    return this.receiveUserInteraction('gesture-down');
};

SpriteMorph.prototype.gestureTurnClockwise = function () {
    return this.receiveUserInteraction('gesture-turnClockwise');
};

SpriteMorph.prototype.gestureTurnAnticlockwise = function () {
    return this.receiveUserInteraction('gesture-turnAnticlockwise');
};

SpriteMorph.prototype.gestureDoubleTapped = function () {
    return this.receiveUserInteraction('gesture-doubleTapped');
};

SpriteMorph.prototype.gesSequentRight = function () {
    return this.receiveUserInteraction('gesture-sequentRight');
};

SpriteMorph.prototype.gesSequentLeft = function () {
    return this.receiveUserInteraction('gesture-sequentLeft');
};

SpriteMorph.prototype.gesSequentUp = function () {
    return this.receiveUserInteraction('gesture-sequentUp');
};

SpriteMorph.prototype.gesSequentDown = function () {
    return this.receiveUserInteraction('gesture-sequentDown');
};

SpriteMorph.prototype.gesSequentTurnClockwise = function () {
    return this.receiveUserInteraction('gesture-sequentTurnClockwise');
};

SpriteMorph.prototype.gesSequentTurnAntiClockwise = function () {
    return this.receiveUserInteraction('gesture-sequentTurnAntiClockwise');
};

StageMorph.prototype.enableFullScreen = true;
StageMorph.prototype.backgrounddimensions = new Point(1440, 1080); // unscaled extent,will be reset after the world resize

StageMorph.prototype.org_init = StageMorph.prototype.init;
StageMorph.prototype.init = function (globals) {
    this.wsState = 0;		// websocket connection state
    this.wsDataState = 0;  // websocket data state
    this.wsQueue = new List();  // queue the access requests of the different processes 
    this.wsQueueNo = 0;    
    this.wsLastAddr = '';	
    this.lastRemoteEvent = '';
    
		this.alternativeColor = new Color(0,0,0);
		this.isColorReplaced = false;
		
		this.org_init(globals);   	
};

StageMorph.prototype.resetExtent = function (newExtent) {
		var	pos = this.position(),
        relativePos,
        oldCenter = this.extent().divideBy(2),
        newCenter = newExtent.divideBy(2),
        oldFlag = Morph.prototype.trackChanges,
        newTrailCanvas,
        bias,
        ctx;
        
    Morph.prototype.trackChanges = false;      
    this.children.forEach(function (morph) {
        relativePos = morph.position().subtract(pos.add(oldCenter));
        morph.drawNew();
        morph.setPosition(
            relativePos.add(pos.add(newCenter)),
            true // just me (for nested sprites)
        );       	 
    });            
 
    Morph.prototype.trackChanges = oldFlag;
    this.setExtent(newExtent);    
    
    /* experiment for lightening system
    if (this.hasLightOn()) {
    		this.createLightEffects();
    }    
    */
    this.changed();
};

StageMorph.prototype.clearPenTrails = function () {
    this.trailsCanvas = newCanvas(this.enableFullScreen?this.backgrounddimensions:this.dimensions);
    this.changed();
};

StageMorph.prototype.penTrails = function () {
    if (!this.trailsCanvas) {
        this.trailsCanvas = newCanvas(this.enableFullScreen?this.backgrounddimensions:this.dimensions);
    }
    return this.trailsCanvas;
};

StageMorph.prototype.drawNew = function () {
    var ctx;
    StageMorph.uber.drawNew.call(this);
    if (this.costume) {
        ctx = this.image.getContext('2d');
        ctx.scale(this.scale, this.scale);
        /*
        ctx.drawImage(
            this.costume.contents,
            (this.width() / this.scale - this.costume.width()) / 2,
            (this.height() / this.scale - this.costume.height()) / 2
        );
        */
        ctx.drawImage(
            this.costume.contents,
            0,
            0,
            this.width()/this.scale,
            this.height()/this.scale
        );        
        // this.setBufferedRawImage(); experiment for lightening system
        this.image = this.applyGraphicsEffects(this.image);
        this.changed();
        // this.setBufferedImage(); experiment for lightening system
        // this.image = this.applyLightEffects(this.image); experiment for lightening system
    }else{
        this.image = this.applyGraphicsEffects(this.image);	
        this.changed();
    }
    this.version = Date.now(); // for observer optimization
};

StageMorph.prototype.drawOn = function (aCanvas, aRect) {
    // make sure to draw the pen trails canvas as well
    var rectangle, area, delta, src, context, w, h, sl, st, ws, hs,
    		trailsOffset = new Point(Math.floor((this.penTrails().width-this.bounds.width()/this.scale)/2),Math.floor((this.penTrails().height-this.bounds.height()/this.scale)/2));
    if (!this.isVisible) {
        return null;
    }
    rectangle = aRect || this.bounds;
    area = rectangle.intersect(this.bounds);
    if (area.extent().gt(new Point(0, 0))) {
        delta = this.position().neg();
        src = area.copy().translateBy(delta);
        context = aCanvas.getContext('2d');
        context.globalAlpha = this.alpha;

        sl = src.left();
        st = src.top();
        w = Math.min(src.width(), this.image.width - sl);
        h = Math.min(src.height(), this.image.height - st);

        if (w < 1 || h < 1) {
            return null;
        }
        context.drawImage(
            this.image,
            sl,
            st,
            w,
            h,
            area.left(),
            area.top(),
            w,
            h
        );

        // pen trails
        ws = w / this.scale;
        hs = h / this.scale;
        context.save();
        context.scale(this.scale, this.scale);
        try {
            context.drawImage(
                this.penTrails(),
                sl / this.scale + trailsOffset.x,
                st / this.scale + trailsOffset.y,
                ws,
                hs,
                area.left() /this.scale,
                area.top() /this.scale,
                ws,
                hs
            );
        } catch (err) { // sometimes triggered only by Firefox
            // console.log(err);
            context.restore();
            context.drawImage(
                this.penTrails(),
                trailsOffset.x,
                trailsOffset.y,
                this.dimensions.x,
                this.dimensions.y,
                this.left(),
                this.top(),
                this.dimensions.x * this.scale,
                this.dimensions.y * this.scale
            );
        }
        context.restore();
    }
};

StageMorph.prototype.colorFiltered = function (aColor, excludedSprite) {
    // answer a new Morph containing my image filtered by aColor
    // ignore the excludedSprite, because its collision is checked
    // ignore transparency (alpha)
    var morph = new Morph(),
        ext = this.extent(),
        img = this.thumbnail(ext, excludedSprite),
        ide = this.parentThatIsA(IDE_Morph),
        ctx,
        src,
        clr,
        i,
        top,left,right,bottom,width,height,
        dta;
	
    	
        left = excludedSprite.bounds.origin.x-this.bounds.origin.x;
        top = excludedSprite.bounds.origin.y-this.bounds.origin.y;
    		right = excludedSprite.bounds.corner.x-this.bounds.origin.x;
    		bottom = excludedSprite.bounds.corner.y-this.bounds.origin.y;
    		left = Math.max(left-50,0);
    		top = Math.max(top-50,0);
    		right = Math.min(right+50,ext.x);
    		bottom = Math.min(bottom+50,ext.y);
    		width = right-left;
    		height = bottom-top;
    
    		src = normalizeCanvas(img, true).getContext('2d').getImageData(
        left,
        top,
        width,
        height
    );
    
  
    //morph.bounds = this.bounds.copy();
    morph.bounds = new Rectangle(this.bounds.origin.x+left, this.bounds.origin.y+top, this.bounds.origin.x+right, this.bounds.origin.y+bottom);
    morph.image = newCanvas(new Point(width+1,height+1), true);
    ctx = morph.image.getContext('2d');
    
    dta = ctx.createImageData(width, height);
    for (i = 0; i < width * height * 4; i += 4) {
        clr = new Color(
            src.data[i],
            src.data[i + 1],
            src.data[i + 2]
        );
        if (clr.eq(aColor)) {
            dta.data[i] = src.data[i];
            dta.data[i + 1] = src.data[i + 1];
            dta.data[i + 2] = src.data[i + 2];
            dta.data[i + 3] = 255;
        }
    }
    ctx.putImageData(dta, 0, 0);       
    return morph;
};

// StageMorph thumbnail

StageMorph.prototype.thumbnail = function (extentPoint, excludedSprite) {
/*
    answer a new Canvas of extentPoint dimensions containing
    my thumbnail representation keeping the originial aspect ratio
*/
    var myself = this,
    		ide = this.parentThatIsA(IDE_Morph),
    		trailsOffset = new Point(Math.floor((this.penTrails().width-this.bounds.width()/this.scale)/2),Math.floor((this.penTrails().height-this.bounds.height()/this.scale)/2)),
        src = this.image,
        scale = Math.min(
            (extentPoint.x / src.width),
            (extentPoint.y / src.height)
        ),
        trg = newCanvas(extentPoint),
        ctx = trg.getContext('2d'),
        fb,
        fimg;

    if (ide.isAppMode && this.enableFullScreen){
    		scale = 1;
    }
    ctx.scale(scale, scale);
    
    ctx.drawImage(
        src,
        0,
        0
    );
       
    ctx.drawImage(
        this.penTrails(),
        trailsOffset.x,
        trailsOffset.y,
        ide.isAppMode && this.enableFullScreen?this.bounds.width():this.dimensions.x,
        ide.isAppMode && this.enableFullScreen?this.bounds.height():this.dimensions.y,
        0,
        0,
        this.bounds.width(),
        this.bounds.height()
    );
    this.children.forEach(function (morph) {
        if (morph.isVisible && (morph !== excludedSprite)) {
            fb = morph.fullBounds();
            fimg = morph.fullImage();
            if (fimg.width && fimg.height) {
                ctx.drawImage(
                    morph.fullImage(),
                    fb.origin.x - myself.bounds.origin.x,
                    fb.origin.y - myself.bounds.origin.y
                );
            }
        }
    });
    return trg;
};

StageMorph.prototype.blockTemplates = function (category) {
    var blocks = [], myself = this, varNames, button,
        cat = category || 'motion', txt;

    function block(selector) {
        if (myself.hiddenPrimitives[selector]) {
            return null;
        }
        var newBlock = SpriteMorph.prototype.blockForSelector(selector, true);
        newBlock.isTemplate = true;
        return newBlock;
    }

    function variableBlock(varName) {
        var newBlock = SpriteMorph.prototype.variableBlock(varName);
        newBlock.isDraggable = false;
        newBlock.isTemplate = true;
        return newBlock;
    }

    function watcherToggle(selector) {
        if (myself.hiddenPrimitives[selector]) {
            return null;
        }
        var info = SpriteMorph.prototype.blocks[selector];
        return new ToggleMorph(
            'checkbox',
            this,
            function () {
                myself.toggleWatcher(
                    selector,
                    localize(info.spec),
                    myself.blockColor[info.category]
                );
            },
            null,
            function () {
                return myself.showingWatcher(selector);
            },
            null
        );
    }

    function variableWatcherToggle(varName) {
        return new ToggleMorph(
            'checkbox',
            this,
            function () {
                myself.toggleVariableWatcher(varName);
            },
            null,
            function () {
                return myself.showingVariableWatcher(varName);
            },
            null
        );
    }

    function addVar(pair) {
        if (pair) {
            if (myself.isVariableNameInUse(pair[0])) {
                myself.inform('that name is already in use');
            } else {
                myself.addVariable(pair[0], pair[1]);
                myself.toggleVariableWatcher(pair[0], pair[1]);
                myself.blocksCache[cat] = null;
                myself.paletteCache[cat] = null;
                myself.parentThatIsA(IDE_Morph).refreshPalette();
            }
        }
    }

    if (cat === 'motion') {

        txt = new TextMorph(localize(
            'Stage selected:\nno motion primitives'
        ));
        txt.fontSize = 9;
        txt.setColor(this.paletteTextColor);
        blocks.push(txt);
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'looks') {

        blocks.push(block('doSwitchToCostume'));
        blocks.push(block('doWearNextCostume'));
        blocks.push(watcherToggle('getCostumeIdx'));
        blocks.push(block('getCostumeIdx'));
        blocks.push('-');
        blocks.push(block('changeEffect'));
        blocks.push(block('setEffect'));
        blocks.push(block('setAlternativeColor'));
        blocks.push(block('setAlternativeColorHSV'));        
        blocks.push(block('clearEffects'));
        blocks.push('-');
        blocks.push(block('show'));
        blocks.push(block('hide'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('log'));
            blocks.push(block('alert'));
            blocks.push('-');
            blocks.push(block('doScreenshot'));
        }

    /////////////////////////////////

        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'sound') {

        blocks.push(block('playSound'));
        blocks.push(block('doPlaySoundUntilDone'));
        blocks.push(block('doStopAllSounds'));
        blocks.push('-');
        blocks.push(block('doRest'));
        blocks.push(block('doPlayNote'));
        blocks.push(block('doSetInstrument'));
        blocks.push('-');
        blocks.push(block('doChangeTempo'));
        blocks.push(block('doSetTempo'));
        blocks.push(watcherToggle('getTempo'));
        blocks.push(block('getTempo'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'pen') {

        blocks.push(block('clear'));
        blocks.push(block('reportPenTrailsAsCostume'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'control') {

        blocks.push(block('receiveGo'));
        blocks.push(block('receiveKey'));
        blocks.push(block('receiveInteraction'));
        blocks.push(block('receiveCondition'));
        blocks.push(block('receiveMessage'));
        blocks.push('-');
        blocks.push(block('doBroadcast'));
        blocks.push(block('doBroadcastAndWait'));
        blocks.push(watcherToggle('getLastMessage'));
        blocks.push(block('getLastMessage'));
        blocks.push('-');
        blocks.push(block('doWarp'));
        blocks.push('-');
        blocks.push(block('doWait'));
        blocks.push(block('doWaitUntil'));
        blocks.push('-');
        blocks.push(block('doForever'));
        blocks.push(block('doRepeat'));
        blocks.push(block('doUntil'));
        blocks.push('-');
        blocks.push(block('doIf'));
        blocks.push(block('doIfElse'));
        blocks.push('-');
        blocks.push(block('doReport'));
    /*
    // old STOP variants, migrated to a newer version, now redundant
        blocks.push(block('doStopBlock'));
        blocks.push(block('doStop'));
        blocks.push(block('doStopAll'));
    */
        blocks.push(block('doStopThis'));
    /*
        // migrated to doStopThis, now redundant
        blocks.push(block('doStopOthers'));
    */
        blocks.push('-');
        blocks.push(block('doRun'));
        blocks.push(block('fork'));
        blocks.push(block('evaluate'));
        blocks.push('-');
        blocks.push(block('doTellTo'));
        blocks.push(block('reportAskFor'));
        blocks.push('-');
        blocks.push(block('doCallCC'));
        blocks.push(block('reportCallCC'));
        blocks.push('-');
        blocks.push(block('createClone'));
        blocks.push(block('newClone'));
        blocks.push('-');
        blocks.push(block('doPauseAll'));
        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'sensing') {

        blocks.push(block('doAsk'));
        blocks.push(watcherToggle('getLastAnswer'));
        blocks.push(block('getLastAnswer'));
        blocks.push('-');
        blocks.push(watcherToggle('reportMouseX'));
        blocks.push(block('reportMouseX'));
        blocks.push(watcherToggle('reportMouseY'));
        blocks.push(block('reportMouseY'));
        blocks.push(block('reportMouseDown'));
        blocks.push('-');
        blocks.push(block('reportKeyPressed'));
        blocks.push('-');
        blocks.push(block('doResetTimer'));
        blocks.push(watcherToggle('getTimer'));
        blocks.push(block('getTimer'));
        blocks.push('-');
        blocks.push(block('reportAttributeOf'));

        if (SpriteMorph.prototype.enableFirstClass) {
            blocks.push(block('reportGet'));
        }
        blocks.push('-');

        blocks.push(block('reportURL'));
        blocks.push('-');
        blocks.push(block('reportIsFastTracking'));
        blocks.push(block('doSetFastTracking'));
        blocks.push('-');
        blocks.push(block('reportDate'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {

            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(watcherToggle('reportThreadCount'));
            blocks.push(block('reportThreadCount'));
            blocks.push(block('colorFiltered'));
            blocks.push(block('reportStackSize'));
            blocks.push(block('reportFrameCount'));
        }

    /////////////////////////////////

        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'operators') {

        blocks.push(block('reifyScript'));
        blocks.push(block('reifyReporter'));
        blocks.push(block('reifyPredicate'));
        blocks.push('#');
        blocks.push('-');
        blocks.push(block('reportSum'));
        blocks.push(block('reportDifference'));
        blocks.push(block('reportProduct'));
        blocks.push(block('reportQuotient'));
        blocks.push('-');
        blocks.push(block('reportModulus'));
        blocks.push(block('reportRound'));
        blocks.push(block('reportMonadic'));
        blocks.push(block('reportRandom'));
        blocks.push('-');
        blocks.push(block('reportLessThan'));
        blocks.push(block('reportEquals'));
        blocks.push(block('reportGreaterThan'));
        blocks.push('-');
        blocks.push(block('reportAnd'));
        blocks.push(block('reportOr'));
        blocks.push(block('reportNot'));
        blocks.push(block('reportBoolean'));
        blocks.push('-');
        blocks.push(block('reportJoinWords'));
        blocks.push(block('reportTextSplit'));
        blocks.push(block('reportLetter'));
        blocks.push(block('reportStringSize'));
        blocks.push('-');
        blocks.push(block('reportUnicode'));
        blocks.push(block('reportUnicodeAsLetter'));
        blocks.push('-');
        blocks.push(block('reportIsA'));
        blocks.push(block('reportIsIdentical'));

        if (true) { // (Process.prototype.enableJS) {
            blocks.push('-');
            blocks.push(block('reportJSFunction'));
            if (Process.prototype.enableCompiling) {
                blocks.push(block('reportCompiled'));
            }
        }

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(
                'development mode \ndebugging primitives:'
            );
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('reportTypeOf'));
            blocks.push(block('reportTextFunction'));
        }

    //////////////////////////////////

        blocks.push('=');
        blocks.push(this.makeBlockButton(cat));

    } else if (cat === 'variables') {

        button = new PushButtonMorph(
            null,
            function () {
                new VariableDialogMorph(
                    null,
                    addVar,
                    myself
                ).prompt(
                    'Variable name',
                    null,
                    myself.world()
                );
            },
            'Make a variable'
        );
        blocks.push(button);

        if (this.variables.allNames().length > 0) {
            button = new PushButtonMorph(
                null,
                function () {
                    var menu = new MenuMorph(
                        myself.deleteVariable,
                        null,
                        myself
                    );
                    myself.variables.allNames().forEach(function (name) {
                        menu.addItem(name, name);
                    });
                    menu.popUpAtHand(myself.world());
                },
                'Delete a variable'
            );
            blocks.push(button);
        }

        blocks.push('-');

        varNames = this.reachableGlobalVariableNames(true);
        if (varNames.length > 0) {
            varNames.forEach(function (name) {
                blocks.push(variableWatcherToggle(name));
                blocks.push(variableBlock(name));
            });
            blocks.push('-');
        }

        varNames = this.allLocalVariableNames(true);
        if (varNames.length > 0) {
            varNames.forEach(function (name) {
                blocks.push(variableWatcherToggle(name));
                blocks.push(variableBlock(name, true));
            });
            blocks.push('-');
        }

        blocks.push(block('doSetVar'));
        blocks.push(block('doChangeVar'));
        blocks.push(block('doShowVar'));
        blocks.push(block('doHideVar'));
        blocks.push(block('doDeclareVariables'));
        blocks.push('=');
        blocks.push(block('reportNewList'));
        blocks.push('-');
        blocks.push(block('reportCONS'));
        blocks.push(block('reportListItem'));
        blocks.push(block('reportCDR'));
        blocks.push('-');
        blocks.push(block('reportListLength'));
        blocks.push(block('reportListContainsItem'));
        blocks.push('-');
        blocks.push(block('doAddToList'));
        blocks.push(block('doDeleteFromList'));
        blocks.push(block('doInsertInList'));
        blocks.push(block('doReplaceInList'));

    // for debugging: ///////////////

        if (this.world().isDevMode) {
            blocks.push('-');
            txt = new TextMorph(localize(
                'development mode \ndebugging primitives:'
            ));
            txt.fontSize = 9;
            txt.setColor(this.paletteTextColor);
            blocks.push(txt);
            blocks.push('-');
            blocks.push(block('reportMap'));
            blocks.push('-');
            blocks.push(block('doForEach'));
            blocks.push(block('doShowTable'));
        }

    /////////////////////////////////

        blocks.push('=');

        if (StageMorph.prototype.enableCodeMapping) {
            blocks.push(block('doMapCodeOrHeader'));
            blocks.push(block('doMapValueCode'));
            blocks.push(block('doMapListCode'));
            blocks.push('-');
            blocks.push(block('reportMappedCode'));
            blocks.push('=');
        }

        blocks.push(this.makeBlockButton());
    } else if (cat === 'robot') {
    		blocks.push(block('connectToSnapRobot'));	
    		blocks.push(block('callSnapRobot'));	
    		blocks.push(block('reportSnapRobot'));	
 
        
            button = new PushButtonMorph(
                null,
                function () {
                		var stage = myself.parentThatIsA(StageMorph),
                				ide = myself.parentThatIsA(IDE_Morph),
                				command = 'Self|Install|',
                				dict;
                				
										if (myself.wsState < 2) {
        								new DialogBoxMorph().inform(
            								'SnapRobot',
            								'SnapRobot not connected!',
            								myself.world(),
            								null
        								);
										}else{
											  if (location.hash.substr(0, 9) === '#present:'){
											  	  dict = SnapCloud.parseDict(location.hash.substr(9));
											  		command += ide.projectName + ',' + dict.Username + ',' + location;
														stage.threads.stopAllForReceiver(myself);
														myself.socket.send(command);		
        										new DialogBoxMorph().inform(
            										'SnapRobot',
            										'App installed!',
            										myself.world(),
            										null
        										);														
												}else{
        										new DialogBoxMorph().inform(
            										'SnapRobot',
            										'Please open a cloud project before install!\nIf it is just saved to cloud reopen it again.',
            										myself.world(),
            										null
        										);														
												}
										}
                },
                'install app on SnapRobot'
            );
            button.userMenu = helpMenu;
            button.selector = 'makealink';
            button.showHelp = BlockMorph.prototype.showHelp;
            blocks.push(button);
           	blocks.push(block('receiveRemoteEvent'));	
           	blocks.push(block('getLastRemoteEvent'));
    }
    return blocks;
};

StageMorph.prototype.org_userMenu = StageMorph.prototype.userMenu;
StageMorph.prototype.userMenu = function () {
	  var ide = this.parentThatIsA(IDE_Morph),
        menu = new MenuMorph(this),
        myself = this;
        
    if (ide && ide.isAppMode) {
        menu.addItem(
            "pic...",
            function () {
                ide.saveCanvasAs(
                    myself.fullImageClassic(),
                    myself.name
                );
            },
            'open a new window\nwith a picture of the stage'
        );
        return menu;
    }else{
        return this.org_userMenu();
    }        
};

StageMorph.prototype.setAlternativeColor
    = SpriteMorph.prototype.setAlternativeColor;   
    
StageMorph.prototype.setAlternativeColorHSV
    = SpriteMorph.prototype.setAlternativeColorHSV;

StageMorph.prototype.unsetAlternativeColor    
    = SpriteMorph.prototype.unsetAlternativeColor;
    
StageMorph.prototype.applyGraphicsEffects
    = SpriteMorph.prototype.applyGraphicsEffects;    

StageMorph.prototype.org_clearEffects
    = SpriteMorph.prototype.org_clearEffects; 
    
StageMorph.prototype.clearEffects
    = SpriteMorph.prototype.clearEffects;   
    
StageMorph.prototype.getWsQueueNo
    = SpriteMorph.prototype.getWsQueueNo;

StageMorph.prototype.matchWsQueueNo
    = SpriteMorph.prototype.matchWsQueueNo;
    
StageMorph.prototype.shiftWsQueue
    = SpriteMorph.prototype.shiftWsQueue;

StageMorph.prototype.wsQueueIsEmpty
    = SpriteMorph.prototype.wsQueueIsEmpty;  
    
StageMorph.prototype.getLastRemoteEvent
    = SpriteMorph.prototype.getLastRemoteEvent;  
   
Costume.prototype.maxExtent = function () {
    return StageMorph.prototype.backgrounddimensions;
};

InputSlotMorph.prototype.org_gettablesMenu = InputSlotMorph.prototype.gettablesMenu;
InputSlotMorph.prototype.gettablesMenu = function () {
    var dict = this.org_gettablesMenu();
    dict['pen is down?'] = ['pen is down?'];
    return dict;
};


InputSlotMorph.prototype.attributesMenu = function () {
    var block = this.parentThatIsA(BlockMorph),
        objName = block.inputs()[1].evaluate(),
        rcvr = block.scriptTarget(),
        stage = rcvr.parentThatIsA(StageMorph),
        obj,
        dict = {},
        varNames = [];

    if (objName === stage.name) {
        obj = stage;
    } else {
        obj = detect(
            stage.children,
            function (morph) {
                return morph.name === objName;
            }
        );
    }
    if (!obj) {
        return dict;
    }
    if (obj instanceof SpriteMorph) {
        dict = {
            'x position' : ['x position'],
            'y position' : ['y position'],
            'direction' : ['direction'],
            'costume #' : ['costume #'],
            'costume name' : ['costume name'],
            'size' : ['size'],
            'width' : ['width'],
            'height' : ['height']               
        };
    } else { // the stage
        dict = {
            'costume #' : ['costume #'],
            'costume name' : ['costume name'],
            'width' : ['width'],
            'height' : ['height']            
        };
    }
    varNames = obj.variables.names();
    if (varNames.length > 0) {
        dict['~'] = null;
        varNames.forEach(function (name) {
            dict[name] = name;
        });
    }
    obj.allBlocks(true).forEach(function (def, i) {
        dict['§_def' + i] = def.blockInstance(true); // include translations
    });
    return dict;
};

Process.prototype.wsQueueNo = 0;

Process.prototype.org_reportGet = Process.prototype.reportGet; 
Process.prototype.reportGet = function (query) {
    var superGet = this.org_reportGet (query),
        thisObj = this.blockReceiver();
        
    if ( superGet !== ''){
        return superGet;
    }else{
        if (thisObj) {
            switch (this.inputOption(query)) {
            case 'pen is down?':
                return thisObj.isDown;
            }
        }
        return '';   	
    }    
};
	
Process.prototype.reportAttributeOf = function (attribute, name) {
    var thisObj = this.blockReceiver(),
        thatObj,
        stage;

    if (thisObj) {
        this.assertAlive(thisObj);
        stage = thisObj.parentThatIsA(StageMorph);
        if (stage.name === name) {
            thatObj = stage;
        } else {
            thatObj = this.getOtherObject(name, thisObj, stage);
        }
        if (thatObj) {
            this.assertAlive(thatObj);
            if (attribute instanceof BlockMorph) { // a "wish"
            	return this.reportContextFor(
             	   this.reify(
                		thatObj.getMethod(attribute.semanticSpec)
                        	.blockInstance(),
                		new List()
                	),
                 	thatObj
                );
            }            
            if (attribute instanceof Context) {
                return this.reportContextFor(attribute, thatObj);
            }
            if (isString(attribute)) {
                return thatObj.variables.getVar(attribute);
            }
            switch (this.inputOption(attribute)) {
            case 'x position':
                return thatObj.xPosition ? thatObj.xPosition() : '';
            case 'y position':
                return thatObj.yPosition ? thatObj.yPosition() : '';
            case 'direction':
                return thatObj.direction ? thatObj.direction() : '';
            case 'width':
            		return Math.floor(thatObj.extent().x/thatObj.scale);
            case 'height':
            		return Math.floor(thatObj.extent().y/thatObj.scale);                
            case 'costume #':
                return thatObj.getCostumeIdx();
            case 'costume name':
                return thatObj.costume ? thatObj.costume.name
                        : thatObj instanceof SpriteMorph ? localize('Turtle')
                                : localize('Empty');
            case 'size':
                return thatObj.getScale ? thatObj.getScale() : '';
            }
        }
    }
    return '';
};

Process.prototype.stop = function () {
	  var i,wsQueueLen;
    this.readyToYield = true;
    this.readyToTerminate = true;
    this.errorFlag = false;
    if (this.context) {
        this.context.stopMusic();
    }
    this.canBroadcast = false;
    if (this.waitingWsResponse) {
    		if (this.homeContext.receiver.wsDataState > 0) {   			
    				this.homeContext.receiver.wsDataState = 0;
    		};
    		this.waitingWsResponse = false;
    }
    if (this.wsQueueNo > 0) {
    	 wsQueueLen = this.homeContext.receiver.wsQueue.length();
       for (i = 1;i <= wsQueueLen;i++) {
       		if (this.homeContext.receiver.wsQueue.at(i) == this.wsQueueNo) {
       			 this.homeContext.receiver.wsQueue.remove(i);
       			 i = wsQueueLen;
       		}
       }    					
    }
};

Process.prototype.connectToSnapRobot = function (robotAddress,timeout) {
		var sprite = this.homeContext.receiver,
				timeoutSecs = timeout === undefined? 5 : timeout;
		    
		if (!sprite.wsConnecting){
			  if (sprite.wsState <= 0) {
  					sprite.wsState = 1;
  					sprite.wsDataState = 0;
  					sprite.wsData = null;
  					this.startWsTime = Date.now();
  					sprite.wsConnecting = true;
  					sprite.socket = new WebSocket('ws://'+robotAddress+':8000');
  					sprite.socket.addEventListener('open',function(event){
    						sprite.wsState = 2;
  					},false);
  					sprite.socket.addEventListener('close',function(event){
    						sprite.wsState = -1;
  					},false);
  					sprite.socket.addEventListener('message',function(event){
  						  var data = event.data,
  						   		dataArr = data.split('|');
  						  if (dataArr[0] === 'event'){
  						  	  sprite.lastRemoteEvent = dataArr[1];
  						  		return sprite.receiveUserInteraction(dataArr[1]);			
  						  }
  						  if (dataArr[0] === 'response'){
    								if (sprite.wsDataState == 1){
      									sprite.wsData = dataArr[1];
      									sprite.wsDataState = 2;
      									sprite.dataVersion = Date.now();
      									sprite.dataRepeatNum = 0;
      									return;
      							}
    						}
  					},false);
  			}else{
  					return;
  			}
		}else{
			  if (sprite.wsState === -1) {
			  	  sprite.wsConnecting = false;			  		
			  		this.topBlock.showBubble(localize('connection failed!'));
			  		return;
			  }
			  if (sprite.wsState === 1) {
			  		if ((Date.now() - this.startWsTime) > (timeout*1000)){
			  			  sprite.wsState = -1;
			  				sprite.wsConnecting = false;
			  				this.topBlock.showBubble(localize('connection failed!'));
			  				return;
			  		}
			  }
  			if (sprite.wsState === 2) {
  					sprite.wsConnecting = false;
    				sprite.wsDataState = 0;
    				sprite.wsLastAddr = robotAddress;
    				return;
  			}
		}
		this.pushContext('doYield');
		this.pushContext();	
};

Process.prototype.callSnapRobot = function (command){
		var sprite = this.homeContext.receiver,
				cmdstr = '',
				i,
				len;

		if (!this.waitingWsResponse){
			
				if (sprite.wsState <= 0) {
						this.topBlock.showBubble(localize('SnapRobot not connected!'));
						return;
				}			

				if (command === null) {
						this.topBlock.showBubble(localize('command is empty!'));
						return;			
				}
						
  			if (sprite.wsDataState === 0 && (sprite.wsQueueIsEmpty() || 
    				(this.wsQueueNo > 0 && sprite.matchWsQueueNo(this.wsQueueNo)))) {
    				if (command.at(1) === '' || command.at(2) === ''){
    					  this.topBlock.showBubble(localize('invalid command!'));	
      					return;
		    		}
    				cmdstr = command.at(1) + '|' + command.at(2);
    				len = command.length();
    				if (len > 2){
      					cmdstr += '|';
      					for (i=3;i<len;i++){
        						cmdstr += command.at(i) + ',';
      					}
      					cmdstr += command.at(len);
    				}
    				sprite.wsDataState = 1;
    				this.waitingWsResponse = true;
    				sprite.socket.send(cmdstr);    
	  		}else{
    				if  (sprite.wsDataState === 1) { 
      					if (this.wsQueueNo === 0) {
         						this.wsQueueNo = sprite.getWsQueueNo();
      					}
    				}
    				if (sprite.wsDataState === 2) {
       					if (!this.dataVersion) {
         						this.dataVersion = sprite.dataVersion;
      					}else if (this.dataVersion == sprite.dataVersion) {
         						sprite.dataRepeatNum++;
         						if (sprite.dataRepeatNum > 10) {
           							sprite.wsDataState = 0;
           							this.dataVersion = 0;
         						} 
      					}
    				} 
  			}
		}else {
  			if (sprite.wsDataState === 2){
    				if (this.wsQueueNo > 0){
      					sprite.shiftWsQueue();
      					this.wsQueueNo = 0;
    				}
    				sprite.wsDataState = 0;
    				this.waitingWsResponse = false; 
    				return;
  			}
		}
		this.pushContext('doYield');
		this.pushContext();	
};

Process.prototype.reportSnapRobot = function (command){
		var sprite = this.homeContext.receiver,
				cmdstr = '',
				i,
				len;
		if (!this.waitingWsResponse){		
		
				if (sprite.wsState <= 0) {
						this.topBlock.showBubble(localize('SnapRobot not connected!'));
						return null;
				}
		
				if (command === null) {
						this.topBlock.showBubble(localize('command is empty!'));
						return null;			
				}
				
  			if (sprite.wsDataState === 0 && (sprite.wsQueueIsEmpty() || 
    				(this.wsQueueNo > 0 && sprite.matchWsQueueNo(this.wsQueueNo)))) {
    				if (command.at(1) === '' || command.at(2) === ''){
    					  this.topBlock.showBubble(localize('invalid command!'));	
      					return;
		    		}
    				cmdstr = command.at(1) + '|' + command.at(2);
    				len = command.length();
    				if (len > 2){
      					cmdstr += '|';
      					for (i=3;i<len;i++){
        						cmdstr += command.at(i) + ',';
      					}
      					cmdstr += command.at(len);
    				}
    				sprite.wsDataState = 1;
    				this.waitingWsResponse = true;
    				sprite.socket.send(cmdstr);    
	  		}else{
    				if  (sprite.wsDataState === 1) { 
      					if (this.wsQueueNo === 0) {
         						this.wsQueueNo = sprite.getWsQueueNo();
      					}
    				}
    				if (sprite.wsDataState === 2) {
       					if (!this.dataVersion) {
         						this.dataVersion = sprite.dataVersion;
      					}else if (this.dataVersion === sprite.dataVersion) {
         						sprite.dataRepeatNum++;
         						if (sprite.dataRepeatNum > 10) {
           							sprite.wsDataState = 0;
           							this.dataVersion = 0;
         						} 
      					}
    				} 
  			}
		}else {
  			if (sprite.wsDataState === 2){
    				if (this.wsQueueNo > 0){
      					sprite.shiftWsQueue();
      					this.wsQueueNo = 0;
    				}
    				sprite.wsDataState = 0;
    				this.waitingWsResponse = false; 
    				return sprite.wsData;
  			}
		}
		this.pushContext('doYield');
		this.pushContext();	
};

SnapSerializer.prototype.rawLoadProjectModel = function (xmlNode) {
    // private
    var myself = this,
        project = {sprites: {}},
        model,
        nameID;

    this.project = project;

    model = {project: xmlNode };
    if (+xmlNode.attributes.version > this.version) {
        throw 'Project uses newer version of Serializer';
    }

    /* Project Info */

    this.objects = {};
    project.name = model.project.attributes.name;
    if (!project.name) {
        nameID = 1;
        while (
            Object.prototype.hasOwnProperty.call(
                localStorage,
                '-snap-project-Untitled ' + nameID
            )
        ) {
            nameID += 1;
        }
        project.name = 'Untitled ' + nameID;
    }
    model.notes = model.project.childNamed('notes');
    if (model.notes) {
        project.notes = model.notes.contents;
    }
    model.globalVariables = model.project.childNamed('variables');
    project.globalVariables = new VariableFrame();

    /* Stage */

    model.stage = model.project.require('stage');
    StageMorph.prototype.frameRate = 0;
    project.stage = new StageMorph(project.globalVariables);
    if (Object.prototype.hasOwnProperty.call(
            model.stage.attributes,
            'id'
        )) {
        this.objects[model.stage.attributes.id] = project.stage;
    }
    if (model.stage.attributes.name) {
        project.stage.name = model.stage.attributes.name;
    }
    if (model.stage.attributes.scheduled === 'true') {
        project.stage.fps = 30;
        StageMorph.prototype.frameRate = 30;
    }
    model.pentrails = model.stage.childNamed('pentrails');
    if (model.pentrails) {
        project.pentrails = new Image();
        project.pentrails.onload = function () {
            if (project.stage.trailsCanvas) { // work-around a bug in FF
                normalizeCanvas(project.stage.trailsCanvas);
                var context = project.stage.trailsCanvas.getContext('2d');
                context.drawImage(project.pentrails, 0, 0);
                project.stage.changed();
            }
        };
        project.pentrails.src = model.pentrails.contents;
    }
    project.stage.setTempo(model.stage.attributes.tempo);
    StageMorph.prototype.dimensions = new Point(480, 360);
    if (model.stage.attributes.width) {
        StageMorph.prototype.dimensions.x =
            Math.max(+model.stage.attributes.width, 480);
    }
    if (model.stage.attributes.height) {
        StageMorph.prototype.dimensions.y =
            Math.max(+model.stage.attributes.height, 180);
    }
    project.stage.setExtent(StageMorph.prototype.dimensions);
    SpriteMorph.prototype.useFlatLineEnds =
        model.stage.attributes.lines === 'flat';
    BooleanSlotMorph.prototype.isTernary =
        model.stage.attributes.ternary !== 'false';
    project.stage.isThreadSafe =
        model.stage.attributes.threadsafe === 'true';
    project.stage.enableFullScreen = 
        model.stage.attributes.fullscreen === 'true';         
    StageMorph.prototype.enableCodeMapping =
        model.stage.attributes.codify === 'true';
    StageMorph.prototype.enableInheritance =
        model.stage.attributes.inheritance !== 'false';
    StageMorph.prototype.enableSublistIDs =
        model.stage.attributes.sublistIDs === 'true';

    model.hiddenPrimitives = model.project.childNamed('hidden');
    if (model.hiddenPrimitives) {
        model.hiddenPrimitives.contents.split(' ').forEach(
            function (sel) {
                if (sel) {
                    StageMorph.prototype.hiddenPrimitives[sel] = true;
                }
            }
        );
    }

    model.codeHeaders = model.project.childNamed('headers');
    if (model.codeHeaders) {
        model.codeHeaders.children.forEach(function (xml) {
            StageMorph.prototype.codeHeaders[xml.tag] = xml.contents;
        });
    }

    model.codeMappings = model.project.childNamed('code');
    if (model.codeMappings) {
        model.codeMappings.children.forEach(function (xml) {
            StageMorph.prototype.codeMappings[xml.tag] = xml.contents;
        });
    }

    model.globalBlocks = model.project.childNamed('blocks');
    if (model.globalBlocks) {
        this.loadCustomBlocks(project.stage, model.globalBlocks, true);
        this.populateCustomBlocks(
            project.stage,
            model.globalBlocks,
            true
        );
    }
    this.loadObject(project.stage, model.stage);

    /* Sprites */

    model.sprites = model.stage.require('sprites');
    project.sprites[project.stage.name] = project.stage;

    model.sprites.childrenNamed('sprite').forEach(function (model) {
        myself.loadValue(model);
    });

    // restore inheritance and nesting associations
    myself.project.stage.children.forEach(function (sprite) {
        var exemplar, anchor;
        if (sprite.inheritanceInfo) { // only sprites can inherit
            exemplar = myself.project.sprites[
                sprite.inheritanceInfo.exemplar
            ];
            if (exemplar) {
                sprite.setExemplar(exemplar);
            }
            sprite.inheritedAttributes = sprite.inheritanceInfo.delegated || [];
            sprite.updatePropagationCache();
        }
        if (sprite.nestingInfo) { // only sprites may have nesting info
            anchor = myself.project.sprites[sprite.nestingInfo.anchor];
            if (anchor) {
                anchor.attachPart(sprite);
            }
            sprite.rotatesWithAnchor = (sprite.nestingInfo.synch === 'true');
        }
    });
    myself.project.stage.children.forEach(function (sprite) {
        var costume;
        if (sprite.nestingInfo) { // only sprites may have nesting info
            sprite.nestingScale = +(sprite.nestingInfo.scale || sprite.scale);
            delete sprite.nestingInfo;
        }
        ['scripts', 'costumes', 'sounds'].forEach(function (att) {
            if (sprite.inheritsAttribute(att)) {
                sprite.refreshInheritedAttribute(att);
            }
        });
        if (sprite.inheritsAttribute('costumes')) {
            costume = sprite.costumes.asArray()[
                sprite.inheritanceInfo.costumeNumber - 1
            ];
            if (costume) {
                if (costume.loaded) {
                    sprite.wearCostume(costume, true);
                } else {
                    costume.loaded = function () {
                        sprite.wearCostume(costume, true);
                        this.loaded = true;
                    };
                }
            }
        }
        delete sprite.inheritanceInfo;
    });

    /* Global Variables */

    if (model.globalVariables) {
        this.loadVariables(
            project.globalVariables,
            model.globalVariables
        );
    }

    this.objects = {};

    /* Watchers */

    model.sprites.childrenNamed('watcher').forEach(function (model) {
        var watcher, color, target, hidden, extX, extY;

        color = myself.loadColor(model.attributes.color);
        target = Object.prototype.hasOwnProperty.call(
            model.attributes,
            'scope'
        ) ? project.sprites[model.attributes.scope] : null;

        // determine whether the watcher is hidden, slightly
        // complicated to retain backward compatibility
        // with former tag format: hidden="hidden"
        // now it's: hidden="true"
        hidden = Object.prototype.hasOwnProperty.call(
            model.attributes,
            'hidden'
        ) && (model.attributes.hidden !== 'false');

        if (Object.prototype.hasOwnProperty.call(
                model.attributes,
                'var'
            )) {
            watcher = new WatcherMorph(
                model.attributes['var'],
                color,
                isNil(target) ? project.globalVariables
                    : target.variables,
                model.attributes['var'],
                hidden
            );
        } else {
            watcher = new WatcherMorph(
                localize(myself.watcherLabels[model.attributes.s]),
                color,
                target,
                model.attributes.s,
                hidden
            );
        }
        watcher.setStyle(model.attributes.style || 'normal');
        if (watcher.style === 'slider') {
            watcher.setSliderMin(model.attributes.min || '1', true);
            watcher.setSliderMax(model.attributes.max || '100', true);
        }
        watcher.setPosition(
            project.stage.topLeft().add(new Point(
                +model.attributes.x || 0,
                +model.attributes.y || 0
            ))
        );
        project.stage.add(watcher);
        watcher.onNextStep = function () {this.currentValue = null; };

        // set watcher's contentsMorph's extent if it is showing a list and
        // its monitor dimensions are given
        if (watcher.currentValue instanceof List) {
            extX = model.attributes.extX;
            if (extX) {
                watcher.cellMorph.contentsMorph.setWidth(+extX);
            }
            extY = model.attributes.extY;
            if (extY) {
                watcher.cellMorph.contentsMorph.setHeight(+extY);
            }
            // adjust my contentsMorph's handle position
            watcher.cellMorph.contentsMorph.handle.drawNew();
        }
    });

    // clear sprites' inherited methods caches, if any
    myself.project.stage.children.forEach(function (sprite) {
        sprite.inheritedMethodsCache = [];
    });

    this.objects = {};
    return project;
};

StageMorph.prototype.toXML = function (serializer) {
    var thumbnail = normalizeCanvas(
            this.thumbnail(SnapSerializer.prototype.thumbnailSize),
            true
        ),
        thumbdata,
        ide = this.parentThatIsA(IDE_Morph);

    // catch cross-origin tainting exception when using SVG costumes
    try {
        thumbdata = thumbnail.toDataURL('image/png');
    } catch (error) {
        thumbdata = null;
    }

    function code(key) {
        var str = '';
        Object.keys(StageMorph.prototype[key]).forEach(
            function (selector) {
                str += (
                    '<' + selector + '>' +
                        XML_Element.prototype.escape(
                            StageMorph.prototype[key][selector]
                        ) +
                        '</' + selector + '>'
                );
            }
        );
        return str;
    }

    this.removeAllClones();
    return serializer.format(
        '<project name="@" app="@" version="@">' +
            '<notes>$</notes>' +
            '<thumbnail>$</thumbnail>' +
            '<stage name="@" width="@" height="@" ' +
            'costume="@" tempo="@" threadsafe="@" fullscreen="@" ' +
            '%' +
            'lines="@" ' +
            'ternary="@" ' +
            'codify="@" ' +
            'inheritance="@" ' +
            'sublistIDs="@" ' +
            'scheduled="@" ~>' +
            '<pentrails>$</pentrails>' +
            '<costumes>%</costumes>' +
            '<sounds>%</sounds>' +
            '<variables>%</variables>' +
            '<blocks>%</blocks>' +
            '<scripts>%</scripts><sprites>%</sprites>' +
            '</stage>' +
            '<hidden>$</hidden>' +
            '<headers>%</headers>' +
            '<code>%</code>' +
            '<blocks>%</blocks>' +
            '<variables>%</variables>' +
            '</project>',
        (ide && ide.projectName) ? ide.projectName : localize('Untitled'),
        serializer.app,
        serializer.version,
        (ide && ide.projectNotes) ? ide.projectNotes : '',
        thumbdata,
        this.name,
        StageMorph.prototype.dimensions.x,
        StageMorph.prototype.dimensions.y,
        this.getCostumeIdx(),
        this.getTempo(),
        this.isThreadSafe,
        this.enableFullScreen,
        this.instrument ?
                ' instrument="' + parseInt(this.instrument) + '" ' : '',
        SpriteMorph.prototype.useFlatLineEnds ? 'flat' : 'round',
        BooleanSlotMorph.prototype.isTernary,
        this.enableCodeMapping,
        this.enableInheritance,
        this.enableSublistIDs,
        StageMorph.prototype.frameRate !== 0,
        normalizeCanvas(this.trailsCanvas, true).toDataURL('image/png'),
        serializer.store(this.costumes, this.name + '_cst'),
        serializer.store(this.sounds, this.name + '_snd'),
        serializer.store(this.variables),
        serializer.store(this.customBlocks),
        serializer.store(this.scripts),
        serializer.store(this.children),
        Object.keys(StageMorph.prototype.hiddenPrimitives).reduce(
                function (a, b) {return a + ' ' + b; },
                ''
            ),
        code('codeHeaders'),
        code('codeMappings'),
        serializer.store(this.globalBlocks),
        (ide && ide.globalVariables) ?
                    serializer.store(ide.globalVariables) : ''
    );
};

// ON MOBILE DEVICES

WorldMorph.prototype.init = function (aCanvas, fillPage) {
    WorldMorph.uber.init.call(this);
    this.color = new Color(205, 205, 205); // (130, 130, 130)
    this.alpha = 1;
    this.bounds = new Rectangle(0, 0, aCanvas.width, aCanvas.height);
    this.drawNew();
    this.isVisible = true;
    this.isDraggable = false;
    this.currentKey = null; // currently pressed key code
    this.worldCanvas = aCanvas;
    this.noticesTransparentClick = true;

    this.activeSoundInited = false;
    this.nbAudios = 32;
    this.audioIndex = 1;
    this.audios = new List();
    for (var i=0;i<this.nbAudios;i++){
    		this.audios.add(document.createElement('audio'));   
    }		
    
    // additional properties:
    this.stamp = Date.now(); // reference in multi-world setups
    while (this.stamp === Date.now()) {nop(); }
    this.stamp = Date.now();

    this.useFillPage = fillPage;
    if (this.useFillPage === undefined) {
        this.useFillPage = true;
    }
    this.isDevMode = false;
    this.broken = [];
    this.animations = [];
    this.hand = new HandMorph(this);
    this.keyboardReceiver = null;
    this.cursor = null;
    this.lastEditedText = null;
    this.activeMenu = null;
    this.activeHandle = null;
    this.virtualKeyboard = null;
   
		this.initEventListeners();	  
};

WorldMorph.prototype.initEventListeners = function () {
    var canvas = this.worldCanvas, myself = this;

    if (myself.useFillPage) {
        myself.fillPage();
    } else {
        this.changed();
    }

    canvas.addEventListener(
        "mousedown",
        function (event) {
            event.preventDefault();
            canvas.focus();
            myself.hand.processMouseDown(event);
        },
        false
    );

    canvas.addEventListener(
        "touchstart",
        function (event) {  
            myself.hand.processTouchStart(event);     	
        },
        false
    );

    canvas.addEventListener(
        "mouseup",
        function (event) {
            event.preventDefault();
            myself.hand.processMouseUp(event);
        },
        false
    );

    canvas.addEventListener(
        "dblclick",
        function (event) {
            event.preventDefault();
            myself.hand.processDoubleClick(event);
        },
        false
    );

    canvas.addEventListener(
        "touchend",
        function (event) {
            if (!myself.activeSoundInited){
								myself.audios.asArray().forEach(function (audio){
										audio.play();						
								});
								//canvas.focus();
            		myself.activeSoundInited = true;
            }         	
            myself.hand.processTouchEnd(event);
        },
        false
    );

    canvas.addEventListener(
        "mousemove",
        function (event) {
            myself.hand.processMouseMove(event);
        },
        false
    );

    canvas.addEventListener(
        "touchmove",
        function (event) {
            myself.hand.processTouchMove(event);
        },
        false
    );

    canvas.addEventListener(
        "contextmenu",
        function (event) {
            // suppress context menu for Mac-Firefox
            event.preventDefault();
        },
        false
    );

    canvas.addEventListener(
        "keydown",
        function (event) {
            // remember the keyCode in the world's currentKey property
            myself.currentKey = event.keyCode;
            if (myself.keyboardReceiver) {
                myself.keyboardReceiver.processKeyDown(event);
            }
            // supress backspace override
            if (event.keyCode === 8) {
                event.preventDefault();
            }
            // supress tab override and make sure tab gets
            // received by all browsers
            if (event.keyCode === 9) {
                if (myself.keyboardReceiver) {
                    myself.keyboardReceiver.processKeyPress(event);
                }
                event.preventDefault();
            }
            if ((event.ctrlKey && (!event.altKey) || event.metaKey) &&
                    (event.keyCode !== 86)) { // allow pasting-in
                event.preventDefault();
            }
        },
        false
    );

    canvas.addEventListener(
        "keyup",
        function (event) {
            // flush the world's currentKey property
            myself.currentKey = null;
            // dispatch to keyboard receiver
            if (myself.keyboardReceiver) {
                if (myself.keyboardReceiver.processKeyUp) {
                    myself.keyboardReceiver.processKeyUp(event);
                }
            }
            event.preventDefault();
        },
        false
    );

    canvas.addEventListener(
        "keypress",
        function (event) {
            if (myself.keyboardReceiver) {
                myself.keyboardReceiver.processKeyPress(event);
            }
            event.preventDefault();
        },
        false
    );

    canvas.addEventListener( // Safari, Chrome
        "mousewheel",
        function (event) {
            myself.hand.processMouseScroll(event);
            event.preventDefault();
        },
        false
    );
    canvas.addEventListener( // Firefox
        "DOMMouseScroll",
        function (event) {
            myself.hand.processMouseScroll(event);
            event.preventDefault();
        },
        false
    );

    document.body.addEventListener(
        "paste",
        function (event) {
            var txt = event.clipboardData.getData("Text");
            if (txt && myself.cursor) {
                myself.cursor.insert(txt);
            }
        },
        false
    );

    window.addEventListener(
        "dragover",
        function (event) {
            event.preventDefault();
        },
        false
    );
    window.addEventListener(
        "drop",
        function (event) {
            myself.hand.processDrop(event);
            event.preventDefault();
        },
        false
    );

    window.addEventListener(
        "resize",
        function () {
            if (myself.useFillPage) {
                myself.fillPage();
            }
        },
        false
    );

    window.onbeforeunload = function (evt) {
        var e = evt || window.event,
            msg = "Are you sure you want to leave?";
        // For IE and Firefox
        if (e) {
            e.returnValue = msg;
        }
        // For Safari / chrome
        return msg;
    };
};

SpriteMorph.prototype.playSound = function (name) {
    var stage = this.parentThatIsA(StageMorph),
        sound = detect(
            this.sounds.asArray(),
            function (s) {return s.name === name; }
        ),
        active;
    if (sound) {
        active = sound.play(this.world());
        if (stage) {
            stage.activeSounds.push(active);
            stage.activeSounds = stage.activeSounds.filter(function (aud) {
                return !aud.ended && !aud.terminated;
            });
        }
        return active;
    }
};

Sound.prototype.play = function (world) {
    // return an instance of an audio element which can be terminated
    // externally (i.e. by the stage)

    var i,aud;
    if (world){
    	  aud = world.audios.at(world.audioIndex);
    		aud.pause();
    	  world.audioIndex ++;
    		if (world.audioIndex > world.nbAudios) {
    		   	world.audioIndex = 1;
    		}    			
    }else{
    		aud = document.createElement('audio');
    }
    
    aud.src = this.audio.src;
    aud.play();
    return aud;
};