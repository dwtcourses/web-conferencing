/**
 * WebRTC provider module for Web Conferencing. This script will be used to add a provider to Web Conferencing module and then
 * handle calls for portal user/groups.
 */
(function($, webConferencing) {
	"use strict";

	var globalWebConferencing = typeof eXo != "undefined" && eXo && eXo.webConferencing ? eXo.webConferencing : null;
	
	// Use webConferencing from global eXo namespace (for non AMD uses)
	if (!webConferencing && globalWebConferencing) {
		webConferencing = globalWebConferencing;
	}

	if (webConferencing) {

		// Start with default logger, later in configure() we'll get it for the provider.
		// We know it's webrtc here.
		var log = webConferencing.getLog("webrtc");
		//log.trace("> Loading at " + location.origin + location.pathname);
		
		function WebrtcProvider() {
			var NON_WHITESPACE_PATTERN = /\s+/;
			
			var CALL_DISABLED_CLASS = "callDisabled";
			
			var LOCAL_CALL_PREFIX = "webrtc.call_";
			
			var isExoAndroid = /eXo\/.*Android/.test(navigator.userAgent);
			if (isExoAndroid) {
				log.debug("Running on eXo app for Android (WebRTC calls not supported currently)");
			}

			var self = this;
			var settings, userLog;
			
			var message = function(key) {
				return settings ? settings.messages["webrtc." + key] : "";
			};
			this.message = message;
			
			this.isSupportedPlatform = function() {
				try {
					return !isExoAndroid && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && RTCPeerConnection;
				} catch(e) {
					log.warn("Error detecting WebRTC features: " + (typeof e == "string" ? e : ""), e);
					return false;
				}
			};
			
			this.getType = function() {
				if (settings) {
					return settings.type;
				}
			};
			
			this.getSupportedTypes = function() {
				if (settings) {
					return settings.supportedTypes;
				}
			};

			this.getTitle = function() {
				if (settings) {
					return settings.title;
				}
			};
			
			this.getRtcConfiguration = function() {
				if (settings) {
					return settings.rtcConfiguration;
				}
			};

			this.configure = function(theSettings) {
				settings = theSettings;
			};

			this.isConfigured = function() {
				return settings != null;
			};
			
			/**
			 * TODO not used, setting loaded with the module (see in init())
			 */
			var getSettings = function() {
				var request = $.ajax({
					async : true,
					type : "GET",
					url : "/portal/rest/webrtc/webconferencing/settings"
				});
				return webConferencing.initRequest(request);
			};
			
			var postSettings = function(settings) {
				var request = $.ajax({
					async : true,
					type : "POST",
					url : "/portal/rest/webrtc/webconferencing/settings",
					data : settings
				});
				return webConferencing.initRequest(request);
			};
			
			var callLink = function(callId) {
				return settings.callUri + "/" + callId;
			}
			
			var windowId = function(localUserId, callId) {
				return localUserId + ":" + callId;
			};
			
			var saveCallWindow = function(callId, windowId) {
				if (typeof Storage != "undefined") {
			  	localStorage.setItem(LOCAL_CALL_PREFIX + callId, windowId);
				} // otherwise, save nothing
			};
			
			var removeCallWindow = function(callId) {
				if (typeof Storage != "undefined") {
			  	localStorage.removeItem(LOCAL_CALL_PREFIX + callId);
				}
			};
			
			var readCallWindow = function(callId) {
				if (typeof Storage != "undefined") {
			  	return localStorage.getItem(LOCAL_CALL_PREFIX + callId);
				} else {
					return null;
				}
			};

			var joinedCall = function(callId) {
				return webConferencing.updateUserCall(callId, "joined");
			};
			this.joinedCall = joinedCall;
			
			var leavedCall = function(callId) {
				return webConferencing.updateUserCall(callId, "leaved");
			};
			this.leavedCall = leavedCall;
			
			var deleteCall = function(callId) {
				// For P2P we delete closed call
				removeCallWindow(callId); // do this first!
				var process = $.Deferred();
				webConferencing.deleteCall(callId).done(function() {
					log.debug("Call deleted: " + callId);
					process.resolve();
				}).fail(function(err) {
					if (err && err.code == "NOT_FOUND_ERROR") {
						// already deleted
						log.trace("Call not found: " + callId);
						process.resolve();
					} else {
						log.error("Failed to delete a call: " + callId, err);
						process.reject(err);
					}
				});
				return process.promise();
			};
			this.deleteCall = deleteCall;
			
			var onCallWindowReady = function(theWindow) {
				var process = $.Deferred();
				if (typeof theWindow === "undefined" || theWindow == null) {
					process.reject(message("callWindowNotOpen"));
				} else {
					var resolve = function() {
						if (process.state() == "pending") {
							if (theWindow && theWindow.eXo && theWindow.eXo.webConferencing && typeof theWindow.eXo.webConferencing.startCall == "function") {
								process.resolve(theWindow);
								return true;
							} else {
								return false;
							}
						} else {
							return true;
						}
					};
					$(theWindow).on("load", function() {
						resolve();
					});
					var checker = setInterval(function() {
						if (resolve()) {
							clearInterval(checker);
						}
					}, 250);
				}
				return process.promise();
			};
			
			var setButtonCall = function($button, callId) {
				// We don't lock, but let open the call window
				//if (!$button.hasClass(CALL_DISABLED_CLASS)) {
				//	$button.addClass(CALL_DISABLED_CLASS);
				//}
				$button.data("callid", callId);
				$button.attr("title", message("callRunningTip"));
			};
			
			var removeButtonCall = function($button) {
				//$button.removeClass(CALL_DISABLED_CLASS);
				$button.removeData("callid"); // we don't touch targetid, it managed by callButton()
				$button.attr("title", message("callStartTip"));
			};
			
			var openCallWindow = function(callId, onLocalNotFound) {
				var callWindow;
				var callWindowId = readCallWindow(callId);
				if (callWindowId) {
					// try open already opened call window
					log.trace("Trying to open window of already running call: " + callWindowId);
					callWindow = webConferencing.showCallPopup("", callWindowId);
				}
				if (callWindow && callWindow.location.href !== "about:blank") {
					callWindow.focus();
					log.trace("Successfuly opened window of already running call: " + callWindowId);
				} else {
					log.trace("Starting a call: " + callId);
					// if callWindow defined (was open successful) it already assigned the windowId above
					// and need only set its location to the call link.
					onLocalNotFound(callWindow);
				}
			};
			
			this.callButton = function(context) {
				var button = $.Deferred();
				if (self.isSupportedPlatform()) {
					if (settings && context && context.currentUser) {
						// XXX Currently we support only P2P calls
						if (!context.isGroup) {
							context.details().done(function(target) {
								// We want have same ID independently on who started the call
								var callId;
								if (target.group) {
									// This should not happen until group calls will be supported
									callId = "g/" + (target.type == "chat_room" ? context.roomName : target.id);
								} else {
									// Sort IMs to have always the same ID (independently on who started the call)
									var parts = [context.currentUser.id, target.id];
									var partsAsc = parts.slice();
									partsAsc.sort();
									callId = "p/" + partsAsc.join("@");
								}
								var $button = $("<a title='" + message("callStartTip") + "'"
											+ " class='webrtcCallAction' data-placement='top' data-toggle='tooltip'>"
											+ "<i class='uiIcon callButtonIconVideo uiIconLightGray'></i>"
											+ "<span class='callTitle'>" + message("call") + "</span></a>");
								if (readCallWindow(callId)) {
									// If call window saved locally: check if the call isn't running and joined by this user and mark the button if so
									webConferencing.getCall(callId).done(function(call) { // this will call server-side via Comet
										if (call.state == "started") {
											for (var pi = 0; pi < call.participants.length; pi++) {
												var p = call.participants[pi];
												if (p.id == context.currentUser.id) {
													if (p.state == "joined") {
														log.trace(">>> Call " + callId + " already joined by " + context.currentUser.id);
														setButtonCall($button, callId); // should be removed on stop/leaved event in init()
														return;
													}
												}
											}											
										}
										removeCallWindow(callId);
									}).fail(function(err) {
										// we don't show any error at this stage, but let an user to place a new call
										removeCallWindow(callId);
										if (err && err.code == "NOT_FOUND_ERROR") {
											// call not found - OK
										} else {
											log.warn("Failed to get call info: " + callId, err); // warn because we continue and let start a call
										}
									}); 
								}
								$button.click(function() {
									openCallWindow(callId, function(callWindow) {
										// Open a window for a new call
										var link = callLink(callId);
										var callWindowId;
										if (callWindow) {
											callWindow.location.href = link;
										} else {
											callWindowId = windowId(context.currentUser.id, callId);
											callWindow = webConferencing.showCallPopup(link, callWindowId);
										}
										// Create a call
										var callInfo = {
											owner : context.currentUser.id,
											ownerType : "user",
											provider : self.getType(),
											title : target.title,
											participants : [context.currentUser.id, target.id].join(";") // eXo user ids separated by ';' !
										};
										webConferencing.addCall(callId, callInfo).done(function(call) {
											log.info("Call created: " + callId + " target: " + target.title);
											// Tell the window to start the call  
											onCallWindowReady(callWindow).done(function() {
												log.debug("Call page open: " + callId + " target: " + target.title);
												callWindow.document.title = message("callTo") + " " + target.title;
												callWindow.eXo.webConferencing.startCall(call).done(function(state) {
													log.info("Call " + state + ": " + callId + " target: " + target.title);
													setButtonCall($button, callId); // should be removed on stop/leaved event in init()
													if (callWindowId) {
														saveCallWindow(callId, callWindowId);
													}
												}).fail(function(err) {
													log.error("Call start failed: " + callId, err);
													webConferencing.showError(message("errorStartingCall"), webConferencing.errorText(err));
												});
											}).fail(function(err) {
												log.error("Call page failed: " + callId, err);
												webConferencing.showError(message("errorOpeningCall"), webConferencing.errorText(err));
											});
										}).fail(function(err) {
											log.error("Call creation failed: " + callId, err);
											webConferencing.showError(message("errorAddCall"), webConferencing.errorText(err));
											setTimeout(function() {
												// Let error window to be open a bit to see its state/error/etc - for admins/devs
												callWindow.close();
											}, 2500);
										});
									});
								});
                setTimeout(function(){
									$button.filter(".webrtcCallAction.preferred").tooltip();
								},200)
								// Assign target ID to the button for later use on started event in init()
								$button.data("targetid", target.id);
								setTimeout(function() {
									// Wait for promise done handlers outside and enable tooltip for added by them preferred (default) button
									$button.filter(".webrtcCallAction.preferred").tooltip();
								}, 200);
								button.resolve($button);
							}).fail(function(err) {
								var msg = "Error getting context details";
								log.error(msg, err);
								button.reject(msg, err);
							});
						} else {
							var msg = "Group calls not supported";
							log.trace(msg);
							button.reject(msg);
						}
					} else {
						var msg = "Not configured or empty context";
						log.error(msg);
						button.reject(msg);
					}
				} else {
					var msg = "WebRTC calls not supported in this browser: " + navigator.userAgent;
					log.warn(msg);
					button.reject(msg);
				}
				return button.promise();
			};
			
			var acceptCallPopover = function(callerLink, callerAvatar, callerMessage, playRingtone) {
				log.trace(">> acceptCallPopover '" + callerMessage + "' caler:" + callerLink + " avatar:" + callerAvatar);
				var process = $.Deferred();
				var $call = $(".incomingCall");
				$call = $.extend($call, {
					close : function() {
						$call.hide();
						if (process.state() == "pending") {
							process.reject("closed");
						}
					}
				});
				$call.find(".avatar a").attr("href", callerLink);
				$call.find(".avatar img").attr("src", callerAvatar);
				$call.find(".messageText").text(callerMessage);
				$call.find(".uiIconClose").click(function () {
					$call.close();
				});
				$call.find(".answerButton").click(function () {
					process.resolve("accepted");
					$call.hide();
				});
				$call.find(".declineButton").click(function () {
					process.reject("declined");
					$call.hide();
				});
				process.notify($call);
				
				if (playRingtone) {
					// Start ringing incoming sound only if requested (depends on user status)
					var $ring = $("<audio loop autoplay style='display: none;'>" // controls 
								+ "<source src='/webrtc/audio/line.mp3' type='audio/mpeg'>"  
								+ "Your browser does not support the audio element.</audio>");
					$(document.body).append($ring);
					process.fail(function() {
						var $cancel = $("<audio autoplay style='display: none;'>" // controls 
									+ "<source src='/webrtc/audio/manner_cancel.mp3' type='audio/mpeg'>"  
									+ "Your browser does not support the audio element.</audio>");
						$(document.body).append($cancel);
						setTimeout(function() {
							$cancel.remove();
						}, 3000);
					});
					process.always(function() {
						// Stop incoming ringing on dialog completion
						$ring.remove();
					});					
				}
				
				$call.show();
				return process.promise();
			};
			
			this.init = function(context) {
				var process = $.Deferred();
				
				if (self.isSupportedPlatform()) {
					var currentUserId = webConferencing.getUser().id;
					var $callPopup;
					var closeCallPopup = function(callId, state) {
						if ($callPopup && $callPopup.callId && $callPopup.callId == callId) {
							if ($callPopup.is(":visible")) {
								// Set state before closing the dialog, it will be used by promise failure handler
								if (typeof state != "undefined") {
									$callPopup.callState = state;	
								}
								$callPopup.close();
							}								
						}
					};
					var assignCallButton = function(targetId, callId) {
						$(".webrtcCallAction").each(function() {
							var $button = $(this);
							if ($button.data("targetid") == targetId) {
								setButtonCall($button, callId);
							}
						});
					};
					var unassignCallButton = function(callId) {
						$(".webrtcCallAction").each(function() {
							var $button = $(this);
							if ($button.data("callid") == callId) {
								removeButtonCall($button);
							}
						});
					};
					// On portal pages we support incoming calls
					var lastUpdate = null; // XXX it's temp workaround
					var lastUpdateReset;
					if (window.location.pathname.startsWith("/portal/")) {
						// Move incomingCall element to root of the document to do not be affected by parent CSS
						$(document.body).append($(".incomingCall"));
						// Listen to user updates
						webConferencing.onUserUpdate(currentUserId, function(update, status) {
							if (update.providerType == self.getType()) {
								if (update.eventType == "call_state") {
									var callId = update.callId;
									if (update.owner.type == "user") {
										var lastCallId = lastUpdate ? lastUpdate.callId : null;
										var lastCallState = lastUpdate ? lastUpdate.callState : null;
										if (callId == lastCallId && update.callState == lastCallState) {
											log.trace("<<< XXX User call state updated skipped as duplicated: " + JSON.stringify(update) + " [" + status + "]");
										} else {
											log.trace(">>> User call state updated: " + JSON.stringify(update) + " [" + status + "]");
											if (lastUpdateReset) {
												clearTimeout(lastUpdateReset);
											}
											lastUpdate = update;
											lastUpdateReset = setTimeout(function() {
												lastUpdate = null; // XXX avoid double action on duplicated update - temp solution
											}, 500);
											if (update.callState == "started") {
												log.info("Incoming call: " + callId);
												webConferencing.getCall(callId).done(function(call) {
													log.trace(">>> Got registered " + callId);
													var callWindow;
													var callWindowId = readCallWindow(callId);
													if (callWindowId) {
														callWindow = webConferencing.showCallPopup("", callWindowId);
													}
													// here this window will be blocked by popup blocker and will be undefined
													// need use messaging between windows to know if a call is actually running
													if (callWindow && callWindow.location.href !== "about:blank") {
														// call already running in this browser - don't need ask the user for it
														log.trace(">>> Call alreadey joined and running: " + callWindowId);
													} else {
														if (callWindow) {
															callWindow.close();
														}
														var callerId = call.owner.id;
														var callerLink = call.owner.profileLink;
														var callerAvatar = call.owner.avatarLink;
														var callerMessage = call.owner.title + " " + message("callingYou");
														var callerRoom = callerId;
														call.title = call.owner.title; // for callee the call title is a caller name
														webConferencing.getUserStatus(currentUserId).done(function(user) {
															var popover = acceptCallPopover(callerLink, callerAvatar, callerMessage, !user || user.status == "available" || user.status == "away");
															popover.progress(function($call) {
																$callPopup = $call;
																$callPopup.callId = callId;
																$callPopup.callState = update.callState;
															}); 
															popover.done(function(msg) {
																log.info("User " + msg + " call: " + callId);
																// We try open already running call if found, then create a new call if not found
																openCallWindow(callId, function(callWindow) {
																	var link = callLink(callId);
																	var callWindowId;
																	if (callWindow) {
																		callWindow.location.href = link;
																	} else {
																		callWindowId = windowId(context.currentUser.id, callId);
																		callWindow = webConferencing.showCallPopup(link, callWindowId);
																	}
																	// Tell the window to start a call  
																	onCallWindowReady(callWindow).done(function() {
																		log.debug("Call page loaded: " + callId);
																		callWindow.document.title = message("callWith") + " " + call.owner.title;
																		callWindow.eXo.webConferencing.startCall(call).done(function(state) {
																			log.info("Call " + state + ": " + callId);
																			assignCallButton(update.owner.id, callId);
																			if (callWindowId) {
																				saveCallWindow(callId, callWindowId);
																			}
																		}).fail(function(err) {
																			log.error("Failed to start/join call: " + callId, err);
																			webConferencing.showError(message("errorStartingCall"), webConferencing.errorText(err));
																		});
																	});
																});
															});
															popover.fail(function(msg) {
																log.info("User " + msg + " call: " + callId);
																if ($callPopup.callState != "stopped" && $callPopup.callState != "joined") {
																	log.trace("<<< User " + msg + ($callPopup.callState ? " just " + $callPopup.callState : "") + " call " + callId + ", deleting it.");
																	deleteCall(callId);
																}
															});
														}).fail(function(err) {
															log.error("Failed to get user status: " + currentUserId, err);
															if (err) {
																webConferencing.showError(message("errorIncomingCall"), webConferencing.errorText(err));
															} else {
																webConferencing.showError(message("errorIncomingCall"), message("errorReadUserStatus"));
															}
														});														
													}
												}).fail(function(err) {
													log.error("Failed to get call info: " + callId, err);
													if (err) {
														webConferencing.showError(message("errorIncomingCall"), webConferencing.errorText(err));
													} else {
														webConferencing.showError(message("errorIncomingCall"), message("errorReadCall"));
													}
												});
											} else if (update.callState == "stopped") {
												log.info("Call stopped remotelly: " + callId);
												// Hide accept popover for this call, if any
												closeCallPopup(callId, update.callState);
												unassignCallButton(callId);
												removeCallWindow(callId);
											} 
											// "call_joined" to use with group calls and close its popup
											// "call_leaved" to unlock a call button of group call
										}
									} else {
										log.warn("Group calls not supported: " + callId);
									}
								} else if (update.eventType == "call_joined") {
									// If user has incoming popup open for this call (several user's windows/clients), then close it
									log.debug("User call joined: " + update.callId);
									if (currentUserId == update.part.id) {
										closeCallPopup(update.callId, "joined");
									}
								} else if (update.eventType == "call_leaved") {
									// TODO not used
								} else if (update.eventType == "retry") {
									log.trace("<<< Retry for user updates [" + status + "]");
								} else {
									log.warn("Unexpected user update: " + JSON.stringify(update));
								}
							} // it's other provider type
						}, function(err) {
							log.error("Failed to listen on user updates", err);
						});
					}
					process.resolve();
				} else {
					log.error("WebRTC not supported in this browser: " + navigator.userAgent);
					process.reject(message("yourBrowserNotSupportWebrtc") + ": " + navigator.userAgent);
				}
				return process.promise();
			};
			
			this.showSettings = function(context) {
				var process = $.Deferred();
				// load HTML with settings
				var $popup = $("#webrtc-settings-popup");
				if ($popup.length == 0) {
					$popup = $("<div class='uiPopupWrapper' id='webrtc-settings-popup' style='display: none;'><div>");
					$(document.body).append($popup);
				}
				$popup.load("/webrtc/settings", function(content, textStatus) {
					if (textStatus == "success" || textStatus == "notmodified") {
						var $settings = $popup.find(".settingsForm");
						var $iceServers = $settings.find(".iceServers");
						var $serverTemplate = $iceServers.find(".iceServer");
						// copy ICE servers from the working settings and use them for updates
						// Deep copy of the settings.rtcConfiguration as a working copy for the form 
						var rtcConfiguration = $.extend(true, {}, settings.rtcConfiguration);
						//activate tooltip
						$popup.find("[data-toggle='tooltip']").tooltip();
						var $error = $settings.find(".alert-error");
						function showConfError(messageKey, $source) {
							var messageText = message(messageKey);
							//var title = message("admin.wrongSettings");
							$error.find(".errorMessage").text(messageText);
							$error.show();
							if ($source) {
								$error.data("error_source", $source);
							}
						}
						function hideConfError($source) {
							if ($source) {
								var $thisSource = $error.data("error_source");
								if ($thisSource && $thisSource.is($source)) {
									$error.hide();
									$error.removeData("error_source");
								}
							} else {
								$error.hide();
								$error.removeData("error_source");
							}
						}
						function inputWrongMark($input) {
							var $group = $input.closest(".control-group");
							if ($input.val()) {
								$group.removeClass("error");
								hideConfError($input);
							} else if (!$input.hasClass("error")) {
								$group.addClass("error");
							}								
						}
						function addIceServer(ices, $sibling) {
							var $ices = $serverTemplate.clone();
							// Fill URLs
							var $urlsGroup = $ices.find(".urlsGroup");
							$.each(ices.urls, function(ui, url) {
								var $urlGroup = $urlsGroup.find(".urlGroup").first();
								if (ui > 0) {
									$urlGroup = $urlGroup.clone();
									$urlGroup.find("i.uiIconPlus").remove();
									$urlGroup.find("i.uiIconTrash").remove();
									$urlsGroup.append($urlGroup);
								} else {
									$urlGroup.find("i.uiIconPlus").click(function() {
										// Add new ICE server (not URL - this unsupported for the moment)
										var newIces = {
											enabled : true,
											urls : [ "" ]
										};
										addIceServer(newIces, $ices); // add in DOM
										// add in RTC config
										rtcConfiguration.iceServers.push(newIces);
										$settings.scrollTop(90);
									});
									if ($iceServers.find(".iceServer").length == 1) { // 1 is for template
										// Remove trash on first server
										$urlGroup.find("i.uiIconTrash").remove();
									}
								}
								var $url = $urlGroup.find("input[name='url']");
								$url.val(url);
								$url.on("input", function() {
									inputWrongMark($url);
								});
								$url.change(function() {
									inputWrongMark($url);
									var val = $url.val();
									if (val) {
										ices.urls[ui] = val;
									} else {
										ices.urls[ui] = $url;
									}
								});
							});
							// Server removal (trash icon) - do with confirmation
							$urlsGroup.find("i.uiIconTrash").click(function() {
								var $dialog = $popup.find(".serverRemovalDialog");
								$dialog.find(".removeButton").click(function() {
									// Remove this ICE server in DOM
									$ices.remove(); 
									// in RTC config
									rtcConfiguration.iceServers = rtcConfiguration.iceServers.filter(function(nextIces) {
										return ices !== nextIces;
									});
									$dialog.hide();
								});
								$dialog.find("a.uiIconClose, .cancelButton").click(function(){
									$dialog.hide();
								});
								$dialog.show();
							});
							// Fill username/credential
							var $credentialsGroup = $ices.find(".credentialsGroup");
							var $enabler = $credentialsGroup.find(".enabler input");
							var $credentials = $credentialsGroup.find(".credentials");
							var $username = $credentials.find("input[name='username']");
							var $credential = $credentials.find("input[name='credential']");
							$enabler.change(function() {
								if ($enabler.prop("checked") && !$credentials.is(":visible")) {
									if (ices.username) {
										$username.val(ices.username);
									} else {
										ices.username = null;
										$username.val("");
									}
									if (ices.credential) {
										$credential.val(ices.credential);
									} else {
										ices.credential = null;
										$credential.val("");
									}
									if (!$credentials.data("initialized")) {
										$credentials.data("initialized", true);
										$username.add($credential).on("input", function() {
											inputWrongMark($(this));
										});
										$username.change(function() {
											inputWrongMark($username);
											var val = $username.val();
											if (val) {
												ices.username = val;
											} else {
												ices.username = $username;
											}
										});
										$credential.change(function() {
											inputWrongMark($credential);
											var val = $credential.val();
											if (val) {
												ices.credential = val;
											} else {
												ices.credential = $credential;
											}
										});
									}
									$credentials.show();
								} else {
									$credentials.hide();
									$username.val("");
									$credential.val("");
									ices.username = null;
									ices.credential = null;
								}
							});
							if (typeof ices.username == "string" || typeof ices.credential == "string") {
								$enabler.prop("checked", true);
								$enabler.change();
							}
							$ices.show();
							if ($sibling) {
								$sibling.after($ices);
							} else {
								$iceServers.append($ices);
							}
							//activate tooltip for added servers
							$ices.find("[data-toggle='tooltip']").tooltip();
						}
						$.each(rtcConfiguration.iceServers, function(si, ices) {
							addIceServer(ices);
						});
						// Error diagnostic checkbox
						var $diagnosticEnabler = $settings.find(".diagnostic-errors input[type='checkbox']");
						if (rtcConfiguration.logEnabled) {
							$diagnosticEnabler.prop("checked", true);
						}
						$diagnosticEnabler.change(function() {
							if ($diagnosticEnabler.prop("checked")) {
								rtcConfiguration.logEnabled = true;
							} else {
								rtcConfiguration.logEnabled = false;	
							}
						});
						// Save action
						function checkConfError() {
							for (var si=0; si<rtcConfiguration.iceServers.length; si++) {
								var is = rtcConfiguration.iceServers[si];
								for (var ui=0; ui<is.urls.length; ui++) {
									var url = is.urls[ui];
									if (typeof url === "object" && url instanceof $) {
										showConfError("admin.serverUrlMandatory", url);
										url.focus();
										return false;
									}
								}
								if (typeof is.username === "object" && is.username instanceof $) { // typeof is.username == "string" && !is.username
									showConfError("admin.usernameMandatory", is.username);
									is.username.focus();
									return false;
								}
								if (typeof is.credential === "object" && is.credential instanceof $) { // typeof is.credential == "string" && !is.credential
									showConfError("admin.credentialMandatory", is.credential);
									is.credential.focus();
									return false;
								}
							}			
							return true;
						}
						$settings.find(".saveButton").click(function() {
							$iceServers.find("input[type='text'], input[type='password']").change(); // force firing 'change' to get autofilled values also
							setTimeout(function() { // timeout to let change events populate config object
								// Validation to do not have an ICE server w/o URL
								if (checkConfError()) {
									var rtcConfStr = JSON.stringify(rtcConfiguration);
									//log.trace("Saving RTC configuration: " + rtcConfStr); // TODO comment it
									postSettings({
										rtcConfiguration : rtcConfStr
									}).done(function(savedRtcConfig) {
										$popup.hide();
										settings.rtcConfiguration = savedRtcConfig;
									}).fail(function(err) {
										log.error("Failed to save admin settings", err);
										webConferencing.showError(message("admin.errorSavingSettings"), webConferencing.errorText(err));
									});									
								}
							}, 200);
						});
						$settings.find("a.uiIconClose, .cancelButton").click(function(){
							$popup.hide();
						});
						$popup.show();
					} else {
						log.error("Filed to load settings page: " + content);
					}
				});
				
				return process.promise();
			};
		}

		var provider = new WebrtcProvider();

		// Add WebRTC provider into webConferencing object of global eXo namespace (for non AMD uses)
		if (globalWebConferencing) {
			globalWebConferencing.webrtc = provider;
		} else {
			log.warn("eXo.webConferencing not defined");
		}
		
		$(function() {
			try {
				// XXX workaround to load CSS until gatein-resources.xml's portlet-skin will be able to load after the Enterprise skin
				webConferencing.loadStyle("/webrtc/skin/webrtc.css");
			} catch(e) {
				log.error("Error loading styles.", e);
			}
		});

		log.trace("< Loaded at " + location.origin + location.pathname);
		
		return provider;
	} else {
		window.console && window.console.log("WARN: webConferencing not given and eXo.webConferencing not defined. WebRTC provider registration skipped.");
	}
})($, typeof webConferencing != "undefined" ? webConferencing : null );
