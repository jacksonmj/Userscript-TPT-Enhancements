// ==UserScript==
// @name		Powder Toy enhancements
// @namespace   http://powdertoythings.co.uk/tptenhance
// @description Fix and improve some things (mainly moderation tools) on powdertoy.co.uk
// @include	 	http*://powdertoy.co.uk/*
// @version		2.02
// @require 	http://userscripts.org/scripts/source/100842.user.js
// @grant 		none
// @updateURL   https://userscripts.org/scripts/source/173466.meta.js
// @downloadURL   https://userscripts.org/scripts/source/173466.user.js
// ==/UserScript==

// Fix silly way of checking whether facebook stuff is loaded
// If facebook is blocked, then the javascript on powdertoy.co.uk errors and does not execute important stuff like callbacks for showing tag info popups
contentEval('if (typeof window.FB == "undefined") window.FB = false;');

contentEval(function(){
	window.tptenhance = {
		sessionKey:"",
		getSessionKey:function()
		{
			if (tptenhance.sessionKey=="")
			{
				$('.main-menu').find('a').each(function(){
					var url = this.href;
					var matches = url.match(/Logout.html\?Key=[A-Za-z0-9]+/)
					if (matches)
					{
						// Logout link found, extract key
						tptenhance.sessionKey = matches[0].split("=")[1];
					}
				});
			}
			return tptenhance.sessionKey;
		},
		disableTagUrl:function(tag)
		{
			return "/Browse/Tags.html?Delete="+encodeURIComponent(tag)+"&Key="+encodeURIComponent(tptenhance.getSessionKey());
		},
		removeTagUrl:function(tag, saveId)
		{
			return "/Browse/EditTag.json?Op=delete&ID="+encodeURIComponent(saveId)+"&Tag="+encodeURIComponent(tag)+"&Key="+encodeURIComponent(tptenhance.getSessionKey());
		},
		tagsTooltip:function(element, tag){
			// Tag info for multiple tags (e.g. /Browse/Tags.html and moderation page
			var filterUser = (window.location.toString().indexOf("/User/Moderation.html")!=-1);
			$(".popover").remove();
			var popOver = $('<div class="popover fade bottom in" style="display: block;"></div>');
			popOver.appendTo(document.body);
			var arrow = $('<div class="arrow"></div>').appendTo(popOver);
			var inner = $('<div class="popover-inner"></div>').appendTo(popOver);
			var title = $('<h3 class="popover-title">Tag Info</h3>').appendTo(inner);
			var content = $('<div class="popover-content">Loading...</div>').appendTo(inner);
			var left = element.offset().left - (popOver.width()/2) + (element.width()/2);
			if (left<0) left = 0;
			popOver.css("left", left);
			popOver.css("top", element.offset().top + element.height());
			var getLocation = "/Browse/Tag.xhtml?Tag="+encodeURIComponent(tag);
			$.get(getLocation, function(data){
				content.html(data);
				var separator = false;
				var currentUserName = $('.SubmenuTitle').text();
				var clickFn = function(e){
					e.preventDefault();
					$.get(this.href);
					var tagInfo = $(this).parents('div.TagInfo');
					if (!tagInfo.next().length || tagInfo.next().is('hr'))
					{
						element.parents(".Tag").remove();
						$(".popover").remove();
						return;
					}
					tagInfo.remove();
				};
				content.find('div.TagInfo').each(function(){
					var tagInfo = $(this);
					var saveId = $(tagInfo.find("a")[0]).text();
					var userName = $(tagInfo.find("a")[1]).text();
					var delButton = $('<a class="pull-right" title="Remove tag from this save">Remove</a>');
					delButton.attr('href',tptenhance.removeTagUrl(tag,saveId));
					delButton.appendTo($(this));
					delButton.on('click', clickFn);
					// If on a user moderation page, show tags from other users at the end
					if (filterUser && userName!=currentUserName)
					{
						if (!separator) separator = $('<hr>').appendTo(content);
						$(this).appendTo(content);
					}
				});
			}, "html");
		},
		tagTooltip:function(element, tag, saveId){
			// Tag info for a single tag, e.g. viewing a save
			$(".popover").remove();
			var popOver = $('<div class="popover fade bottom in" style="display: block;"></div>');
			popOver.appendTo(document.body);
			var arrow = $('<div class="arrow"></div>').appendTo(popOver);
			var inner = $('<div class="popover-inner"></div>').appendTo(popOver);
			var title = $('<h3 class="popover-title">Tag Info</h3>').appendTo(inner);
			var content = $('<div class="popover-content">Loading...</div>').appendTo(inner);
			var left = element.offset().left - (popOver.width()/2) + (element.width()/2);
			if (left<0) left = 0;
			popOver.css("left", left);
			popOver.css("top", element.offset().top + element.height());
			var getLocation = "/Browse/Tag.xhtml?Tag="+encodeURIComponent(tag)+"&SaveID="+encodeURIComponent(saveId);
			$.get(getLocation, function(data){
				content.html(data);
				content.find('div.TagInfo').each(function(){
					var delButton = $('<a class="pull-right" title="Remove tag from this save">Remove</a>');
					delButton.attr('href',tptenhance.removeTagUrl(tag,saveId));
					delButton.appendTo($(this));
					delButton.on('click', function(e){
						e.preventDefault();
						$.get(this.href);
						element.remove();
						$(".popover").remove();
					});
					var disableButton = $('<a class="pull-right" title="Disable tag">Disable</a>');
					disableButton.attr('href',tptenhance.disableTagUrl(tag)+"&Redirect="+encodeURIComponent(location.pathname+location.search));
					disableButton.css('margin-right','10px');
					disableButton.appendTo($(this));
					disableButton.on('click', function(e){
						e.preventDefault();
						$.get(this.href);
						element.remove();
						$(".popover").remove();
					});
					
				});
			}, "html");
		},
		LoadForumBlocks:function(){
			tptenhance.oldLoadForumBlocks();
			$(".Actions > a").each(function(){
				if (this.href.indexOf("/UnhidePost.html")!=-1)
				{
					$(this).click(function(e){
						e.preventDefault();
						$.get(this.href);
						var newElement = $(this).parents('.Comment').children('.Message');
						postID = newElement.attr('id').split("-")[1];
						$.get("/Discussions/Thread/Post.json?Post="+postID, function(data){
							location.reload();
							// TODO: reload like http://powdertoy.co.uk/Applications/Application.Discussions/Javascript/Thread.js $(".Pagination a") click does
						});
					});
				}
			});
		},
		updateSaveComments:function(Link){
			$("#ActionSpinner").fadeIn("fast");
			$.get(Link, function(data){
				$("#ActionSpinner").fadeOut("fast");
				$(".Pagination").html(data.Pagination);
				$("ul.MessageList").empty();
				$("ul.MessageList").html(data.Comments);
				tptenhance.attachSaveCommentHandlers();
			}, "json");
		},
		attachSaveCommentHandlers:function(){
			var clickFn = function(e){
				e.preventDefault();
				$.get(this.href, function(){tptenhance.updateSaveComments(window.lastComments)});
				$(this).parents('.Post').remove();
				return false;
			}
			$(".Actions a").each(function(){
				if (this.href.indexOf('DeleteComment=')!=-1)
					$(this).click(clickFn);
			});
			$(".Pagination a").die('click');
			$(".Pagination a").on('click', function(e){
				Link = this.href.replace(/\.html\?/, ".json?Mode=MessagesOnly&");
				tptenhance.updateSaveComments(Link);
				window.lastComments = this.href;
				e.preventDefault();
			});
		}
			
	}
	// Override tag info popups, and add them to the user moderation page
	// The overridden version has links to delete (instead of disabling) tags, and disabling+deleting is done in an Ajax request (no full page reload)
	if (window.location.toString().indexOf("/User/Moderation.html")!=-1)
	{
		$(document).bind("ready", function(){
			$("span.TagText").on('click', function(){
				tptenhance.tagsTooltip($(this), $(this).text());
			});
			$("div.Tag .DelButton").attr('title', 'Disable');// A clearer tooltip
			$("div.Tag .DelButton").on('click', function(e){
				e.preventDefault();
				$.get(this.href);
				$(this).parents('div.Tag').remove();
				$(".popover").remove();
			});
		});
	}
	if (window.location.toString().indexOf("/Browse/View.html")!=-1)
	{
		window.lastComments = window.location.toString();
		$(document).bind("ready", function(){
			setTimeout(function(){
				$("span.Tag").die('click');
				$("span.Tag").on('click', function(){
					tptenhance.tagTooltip($(this), $(this).text(), currentSaveID);
				});
				tptenhance.attachSaveCommentHandlers();
			},1);
		});
	}
	if (window.location.toString().indexOf("/Browse/Tags.html")!=-1)
	{
		$(document).bind("ready", function(){
			setTimeout(function(){
				$("span.TagText").die('click');
				$("span.TagText").on('click', function(){
					tptenhance.tagsTooltip($(this), $(this).text());
				});
				$("div.Tag .DelButton").attr('title', 'Disable');
				$("div.Tag .DelButton").on('click', function(e){
					e.preventDefault();
					$.get(this.href);
					$(this).parents('div.Tag').remove();
					$(".popover").remove();
				});
			},1);
		});
	}
	if (window.location.toString().indexOf("/Discussions/Thread/View.html")!=-1)
	{
		// Extend LoadForumBlocks to add a click callback to the Unhide post buttons, to fix the site redirecting to the first page of the thread instead of the page with the post when a post is unhidden
		tptenhance.oldLoadForumBlocks = window.LoadForumBlocks;
		window.LoadForumBlocks = tptenhance.LoadForumBlocks;
	}
	if (window.location.toString().indexOf("/Discussions/Thread/HidePost.html")!=-1)
	{
		// To fix the site redirecting to the first page of the thread instead of the page with the post when a post is hidden
		// submit form via Ajax request then redirect to the correct page ourselves
		$('.FullForm').on('submit', function(e){
			e.preventDefault();
			var formData = $(this).serialize();
			formData += "&Hide_Hide=Hide+Post";
			$.post($(this).attr('action'), formData, function(){
				window.location = '/Discussions/Thread/View.html?'+(window.location.search.match(/Post=[0-9]+/)[0]);
			});
		});
	}
	
}.toSource()+'()');

function addCss(cssString)
{
	var head = document.getElementsByTagName('head')[0];
	if (!head) return;
	var newCss = document.createElement('style');
	newCss.type = "text/css";
	newCss.innerHTML = cssString;
	head.appendChild(newCss);
}
addCss('\
.Tag .DelButton { top:auto; background-color:transparent; }\
.popover-inner { width:380px; }\
'
); 

