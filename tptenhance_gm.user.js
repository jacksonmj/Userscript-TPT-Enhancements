// ==UserScript==
// @name		Powder Toy enhancements
// @namespace   http://powdertoythings.co.uk/tptenhance
// @description Fix and improve some things (mainly moderation tools) on powdertoy.co.uk
// @include	 	http*://powdertoy.co.uk/*
// @version		2.15
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
		deletingHtml:'<div class="pull-right label label-info"><i class="icon-refresh icon-white"></i> <strong>Deleting...</strong></div>',
		dummyUrl:"/Themes/Next/Javascript/Browse.View.js",// a random page to use for redirects, which will hopefully load faster than the default redirect (e.g. to a user moderation page) in ajax requests
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
		searchTagUrl:function(search)
		{
			return "/Browse/Tags.html?Search_Query="+encodeURIComponent(search);
		},
		popoverSelectedTag:false,
		popoverElement:false,
		updatePopoverPosition:function()
		{
			var element = tptenhance.popoverElement;
			var popOver = $(".popover");
			if (!popOver.length || !element) return;
			var left = element.offset().left - (popOver.width()/2) + (element.width()/2);
			if (left<0) left = 0;
			popOver.css("left", left);
			popOver.css("top", element.offset().top + element.height());
		},
		removePopover:function()
		{
			tptenhance.popoverElement = false;
			tptenhance.popoverSelectedTag = false;
			$(".popover").remove();
		},
		createTagsPopover:function(element)
		{
			tptenhance.removePopover();
			tptenhance.popoverElement = element;
			var popOver = $('<div class="popover fade bottom in" style="display: block;"></div>');
			popOver.appendTo(document.body);
			var arrow = $('<div class="arrow"></div>').appendTo(popOver);
			var inner = $('<div class="popover-inner"></div>').appendTo(popOver);
			var title = $('<h3 class="popover-title">Tag Info</h3>').appendTo(inner);
			var content = $('<div class="popover-content">Loading...</div>').appendTo(inner);
			tptenhance.updatePopoverPosition();
			return content;
		},
		tagsTooltip:function(element, tag){
			// Tag info for tags in multiple places (e.g. /Browse/Tags.html and moderation page

			// If clicking on the tag that is already open, close the info popup
			if (tag==tptenhance.popoverSelectedTag)
			{
				tptenhance.removePopover();
				return;
			}

			var filterUser = (window.location.toString().indexOf("/User/Moderation.html")!=-1);
			var content = tptenhance.createTagsPopover(element);
			tptenhance.popoverSelectedTag = tag;
			var getLocation = "/Browse/Tag.xhtml?Tag="+encodeURIComponent(tag);
			$.get(getLocation, function(data){
				content.html(data);
				var separator = false;
				var currentUserName = $('.SubmenuTitle').text();
				// Go through the tags in the popup and add Remove links
				content.find('div.TagInfo').each(function(){
					var tagInfo = $(this);
					var saveId = $(tagInfo.find("a")[0]).text();
					var userName = $(tagInfo.find("a")[1]).text();
					var delButton = $('<a class="pull-right" title="Remove tag from this save">Remove</a>');
					delButton.attr('href',tptenhance.removeTagUrl(tag,saveId));
					delButton.appendTo($(this));
					delButton.on('click', tptenhance.tags.removeLinkClick);
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
			// Tag info for a tag in a single place, e.g. viewing a save

			// If clicking on the tag that is already open, close the info popup
			if (tag==tptenhance.popoverSelectedTag)
			{
				tptenhance.removePopover();
				return;
			}

			var content = tptenhance.createTagsPopover(element);
			tptenhance.popoverSelectedTag = tag;
			var getLocation = "/Browse/Tag.xhtml?Tag="+encodeURIComponent(tag)+"&SaveID="+encodeURIComponent(saveId);
			$.get(getLocation, function(data){
				content.html(data);
				var clickFunc = function(e){
					e.preventDefault();
					var url = this.href;
					var that = $(this);
					if (that.text()=="Disable")
						that.replaceWith('<div class="pull-right label label-info" style="margin-right:10px;"><i class="icon-refresh icon-white"></i> <strong>Disabling...</strong></div>');
					else
						that.replaceWith(tptenhance.deletingHtml);
					$.get(url,function(){
						element.remove();// remove tag text
						if (tptenhance.popoverSelectedTag==tag)
							tptenhance.removePopover();// remove tag info popup
						tptenhance.updatePopoverPosition();
					});
				};
				content.find('div.TagInfo').each(function(){
					var delButton = $('<a class="pull-right" title="Remove tag from this save">Remove</a>');
					delButton.attr('href',tptenhance.removeTagUrl(tag,saveId));
					delButton.appendTo($(this));
					delButton.on('click', clickFunc);
					var disableButton = $('<a class="pull-right" title="Disable tag">Disable</a>');
					disableButton.attr('href',tptenhance.disableTagUrl(tag)+"&Redirect="+encodeURIComponent(location.pathname+location.search));
					disableButton.css('margin','0 10px');
					disableButton.appendTo($(this));
					disableButton.on('click', clickFunc);
					var showMore = $('<div style="text-align:right"><a>Show uses on other saves</a></div>');
					showMore.appendTo($(this));
					showMore = showMore.find("a");
					showMore.attr('href',tptenhance.searchTagUrl(tag));
					showMore.on('click', function(e){
						e.preventDefault();
						tptenhance.removePopover();
						tptenhance.tagsTooltip(element, tag);
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
							location.reload(true);
							// TODO: reload like http://powdertoy.co.uk/Applications/Application.Discussions/Javascript/Thread.js $(".Pagination a") click does
						});
					});
				}
			});
		},
		updateSaveComments:function(url, from){
			$("#ActionSpinner").fadeIn("fast");
			tptenhance.commentPageRequestType = from;
			// url = url.replace(/\.html\?/, ".json?Mode=MessagesOnly&");
			tptenhance.commentPageRequest = $.get(url, function(data){
				data = $(data);
				$("#ActionSpinner").fadeOut("fast");
				tptenhance.commentPageRequest = false;
				//$(".Pagination").html(data.Pagination);
				$(".Pagination").replaceWith(data.find(".Pagination"));
				//$("ul.MessageList").empty();
				//$("ul.MessageList").html(data.Comments);
				$("ul.MessageList").replaceWith(data.find("ul.MessageList"));
				tptenhance.attachSaveCommentHandlers();
			}, "html");//"json"
		},
		commentPageRequest:false,
		commentPageRequestType:false,
		commentDeleteWaiting:0,
		attachSaveCommentHandlers:function(){
			var clickFn = function(e){
				e.preventDefault();
				var url = this.href+"&Redirect="+encodeURIComponent(tptenhance.dummyUrl);
				var info = $(tptenhance.deletingHtml);
				$(this).parents('.Actions').replaceWith(info);
				tptenhance.commentDeleteWaiting++;
				if (tptenhance.commentPageRequest && tptenhance.commentPageRequestType=="deleteComment")
				{
					tptenhance.commentPageRequest.abort();
					tptenhance.commentPageRequest = false;
				}
				$.get(url, function(){
					info.replaceWith('<div class="pull-right label label-success"><i class="icon-ok icon-white"></i> <strong>Deleted</strong>');
					tptenhance.commentDeleteWaiting--;
					if (tptenhance.commentDeleteWaiting<=0)
					{
						tptenhance.updateSaveComments(window.lastComments, "deleteComment");
					}
				});
				return false;
			}
			$(".Actions a").each(function(){
				if (this.href.indexOf('DeleteComment=')!=-1)
					$(this).click(clickFn);
			});
			$(".Pagination a").die('click');
			$(".Pagination a").on('click', function(e){
				e.preventDefault();
				window.lastComments = this.href;
				if (tptenhance.commentPageRequest)
					tptenhance.commentPageRequest.abort();
				tptenhance.updateSaveComments(window.lastComments, "pagination");
			});
		},
		tags:
		{
			removeLinkClick:function(e){
				e.preventDefault();
				var tagInfo = $(this).parents('div.TagInfo');
				var url = this.href;
				var info = $(tptenhance.deletingHtml);
				$(this).replaceWith(info);
				$.get(url, function(){
					info.replaceWith('<div class="pull-right label label-success"><i class="icon-ok icon-white"></i> <strong>Deleted</strong></div>');
				});
			},
			disableButtonClick:function(e){
				e.preventDefault();
				var tag = $(this).parents('.Tag').find(".TagText").text();
				if (tptenhance.popoverSelectedTag==tag)
					tptenhance.removePopover();
				var tagElem = $(this).parents('.Tag');
				var url = this.href.replace(/Redirect=[^&]*/, 'Redirect='+encodeURIComponent(tptenhance.dummyUrl));
				$(this).parent().append(' <span class="LoadingIcon"><i class="icon-refresh"></i></span>');
				$(this).css('display','none');
				$.get(url, function()
				{
					tptenhance.tags.showDisabled(tagElem);
				});
			},
			enableButtonClick:function(e){
				e.preventDefault();
				var tagElem = $(this).parents('.Tag');
				var url = this.href.replace(/Redirect=[^&]*/, 'Redirect='+encodeURIComponent(tptenhance.dummyUrl));
				$(this).parent().append(' <span class="LoadingIcon"><i class="icon-refresh"></i></span>');
				$(this).css('display','none');
				$.get(url, function()
				{
					tptenhance.tags.showEnabled(tagElem);
				});
			},
			attachHandlers:function(baseElem){
				baseElem.find('.UnDelButton').off('click').on('click', tptenhance.tags.enableButtonClick);
				baseElem.find('.DelButton').off('click').on('click', tptenhance.tags.disableButtonClick).attr('title', 'Disable');
			},
			// Change the tag to appear as disabled or enabled
			showDisabled:function(tagElem){
				tagElem.addClass('Restricted');
				tagElem.find('.icon-refresh').remove();
				var btn = tagElem.find('.DelButton');
				btn.removeClass('DelButton').addClass('UnDelButton').css('display','inline');
				btn.attr('href', btn.attr('href').replace('/Browse/Tags.html?Delete=','/Browse/Tags.html?UnDelete='));
				btn.attr('title', 'Disable');
				tptenhance.tags.attachHandlers(tagElem);
			},
			showEnabled:function(tagElem){
				tagElem.removeClass('Restricted');
				tagElem.find('.icon-refresh').remove();
				var btn = tagElem.find('.UnDelButton');
				btn.removeClass('UnDelButton').addClass('DelButton').css('display','inline');
				btn.attr('href', btn.attr('href').replace('/Browse/Tags.html?UnDelete=','/Browse/Tags.html?Delete='));
				btn.attr('title', 'Approve');
				tptenhance.tags.attachHandlers(tagElem);
			}
		},
		makeSaveLinks:function(messages)
		{
			messages.each(function(){
				var msg = $(this);
				var text = msg.text();
				msg.empty();
				var regex = /\b(?:(?:id|save|saveid)[^\d\w\s]?)?[0-9]+\b/gi;
				var result, prevLastIndex = 0;
				regex.lastIndex = 0;
				while (result=regex.exec(text))
				{
					// Append the text before the match
					msg.append($('<span></span>').text(text.slice(prevLastIndex, result.index)));
					// Turn the match into a link
					var link = $('<a></a>');
					link.attr('href', tptenhance.saves.viewUrl(result[0].match(/[0-9]+/)[0]));
					link.text(result[0]);
					msg.append(link);
					// store the position of the end of the match
					prevLastIndex = regex.lastIndex;
				}
				// Append last plain text part
				msg.append($('<span></span>').text(text.slice(prevLastIndex)));
			});
		},
		saves:{
			viewUrl:function(id)
			{
				return "/Browse/View.html?ID="+encodeURIComponent(id);
			},
			infoJsonUrl:function(id)
			{
				return "/Browse/View.json?ID="+encodeURIComponent(id);
			}
		}
	}


	// Override tag info popups, and add them to the user moderation page
	// The overridden version has links to delete (instead of disabling) tags, and disabling+deleting is done in an Ajax request (no full page reload)
	if (window.location.toString().indexOf("/User/Moderation.html")!=-1)
	{
		$(document).ready(function(){
			$("span.TagText").on('click', function(){
				tptenhance.tagsTooltip($(this), $(this).text());
			});
			$("div.Tag .DelButton").attr('title', 'Disable');// A clearer tooltip
			$("div.Tag .DelButton").on('click', tptenhance.tags.disableButtonClick);
			// ajax for deleting comments
			var clickFn = function(e){
				e.preventDefault();
				var post = $(this).parents('.Post');
				var info = $(tptenhance.deletingHtml);
				$(this).parents('.Actions').replaceWith(info);
				url = this.href.replace(/Redirect=[^&]*/, 'Redirect='+encodeURIComponent(tptenhance.dummyUrl));
				$.get(url, function(){
					post.css('color','#AAA');
					info.replaceWith('<div class="pull-right label label-success"><i class="icon-ok icon-white"></i> <strong>Deleted.</strong> Refresh page to update list of recent comments</span></div>');
				});
			}
			$(".Actions a").each(function(){
				if (this.href.indexOf('DeleteComment=')!=-1)
					$(this).click(clickFn);
			});
			$(".BanUser form").on('submit', function(e){
				// Try to prevent accidental perm bans
				var form = $(".BanUser form");
				if (form.find('select[name="BanTimeSpan"]').val()!="p")
				{
					var banTime = form.find('input[name="BanTime"]').val();
					if (banTime.toString() != (+banTime).toString() || (+banTime)<=0)
					{
						alert("Enter a ban time, or select 'Perm' from the dropdown box");
						e.preventDefault();
						return false;
					}
					else if (form.find('input[name="BanReason"]').val() == "Ban Reason")
					{
						alert("Enter a ban reason");
						e.preventDefault();
						return false;
					}
				}
			});
		});
	}
	if (window.location.toString().indexOf("/Browse/View.html")!=-1)
	{
		window.lastComments = window.location.toString();
		$(document).ready(function(){
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
		$(document).ready(function(){
			setTimeout(function(){
				$("span.TagText").die('click');
				$("span.TagText").on('click', function(){
					tptenhance.tagsTooltip($(this), $(this).text());
				});
				tptenhance.tags.attachHandlers($("div.Tag"));
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
		$(document).ready(function(){
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
		});
	}
	if (window.location.toString().indexOf("/Groups/Thread/")!=-1)
	{
		$(document).ready(function(){
			// WYSIWYG editor
			tptenhance.wysiwygLoaded = 0;
			var wysiwygPrepare = function()
			{
				tptenhance.wysiwygLoaded++;
				if (tptenhance.wysiwygLoaded>=2)
				{
					WYSIWYG('#AddReplyMessage, textarea[name="Post_Message"], textarea[name="Thread_Message"]');
				}
			}
			$.getScript("/Applications/Application.Discussions/Javascript/jQuery.TinyMCE.js", wysiwygPrepare);
			$.getScript("/Applications/Application.Discussions/Javascript/WYSIWYG.js", wysiwygPrepare);
		});
	}
	if (window.location.toString().indexOf("/Reports/View.html")!=-1)
	{
		$(document).ready(function(){
			tptenhance.makeSaveLinks($(".Post .Message"));
		});
	}
});

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
.Tag .DelButton, .Tag .UnDelButton { top:auto; background-color:transparent; }\
.Tag .LoadingIcon { position:absolute; right:3px; line-height:20px; }\
.popover-inner { width:380px; }\
'
);
if (window.location.toString().indexOf("/Groups/Thread/")!=-1)
{
	addCss('.Moderator .Author, .Administrator .Author { background-image: url("/Themes/Next/Design/Images/Shield.png"); }');
}

