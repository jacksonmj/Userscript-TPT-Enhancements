// ==UserScript==
// @name		Powder Toy enhancements
// @namespace   http://powdertoythings.co.uk/tptenhance
// @description Fix and improve some things (mainly moderation tools) on powdertoy.co.uk
// @include	 	http*://powdertoy.co.uk/*
// @version		2.18
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
			},
			voteMapUrl:function(id)
			{
				return "/IPTools.html?Save="+encodeURIComponent(id);
			},
			voteDataJsonUrl:function(id)
			{
				return "/IPTools/SaveVoteData.json?ID="+encodeURIComponent(id);
			},
			showVotes:function()
			{
				// some of this function is copied from the JS on the website

				var m = [40, 40, 20, 20],
				    w = 612 - m[1] - m[3],
				    h = 300 - m[0] - m[2],
				    parse = d3.time.format("%Y-%m-%d").parse,
				    format = d3.time.format("%Y");
				
				// Scales. Note the inverted domain for the y-scale: bigger is up!
				var x = d3.time.scale().range([0, w]),
				    y = d3.scale.linear().range([h, 0]),
				    xAxis = d3.svg.axis().scale(x).orient("bottom").tickSize(-h, 0).tickPadding(6),
				    yAxis = d3.svg.axis().scale(y).orient("right").tickSize(-w).tickPadding(6);
				
				// An area generator.
				var area = d3.svg.area()
				    .interpolate("step-after")
				    .x(function(d) { return x(d.date); })
				    .y0(function(d) { return y((d.value<0)?d.value:0); })
				    .y1(function(d) { return y((d.value>0)?d.value:0); });
				
				// A line generator.
				var line = d3.svg.line()
				    .interpolate("step-after")
				    .x(function(d) { return x(d.date); })
				    .y(function(d) { return y(d.value); });
				
				var svg = d3.select("#VoteGraph").append("svg:svg")
				    .attr("width", w + m[1] + m[3])
				    .attr("height", h + m[0] + m[2])
				  .append("svg:g")
				    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");
				
				var gradient = svg.append("svg:defs").append("svg:linearGradient")
				    .attr("id", "gradient")
				    .attr("x2", "0%")
				    .attr("y2", "100%");
				
				gradient.append("svg:stop")
				    .attr("offset", "0%")
				    .attr("stop-color", "#9ecae1")
				    .attr("stop-opacity", .5);
				
				gradient.append("svg:stop")
				    .attr("offset", "100%")
				    .attr("stop-color", "#6baed6")
				    .attr("stop-opacity", 1);
				
				svg.append("svg:clipPath")
				    .attr("id", "clip")
				  .append("svg:rect")
				    .attr("x", x(0))
				    .attr("y", y(1))
				    .attr("width", x(1) - x(0))
				    .attr("height", y(0) - y(1));
				
				svg.append("svg:g")
				    .attr("class", "y axis")
				    .attr("transform", "translate(" + w + ",0)");
				
				svg.append("svg:path")
				    .attr("class", "area")
				    .attr("clip-path", "url(#clip)")
				    .style("fill", "url(#gradient)");
				
				svg.append("svg:g")
				    .attr("class", "x axis")
				    .attr("transform", "translate(0," + h + ")");
				
				svg.append("svg:path")
				    .attr("class", "line")
				    .attr("clip-path", "url(#clip)");
				    
				var voteLines = svg.append("svg:g");
				    
				var dupVLine;
				
				var rect = svg.append("svg:rect")
				    .attr("class", "pane")
				    .attr("width", w)
				    .attr("height", h);
				    //.call(d3.behavior.zoom().on("zoom", zoom));
				
				d3.json(tptenhance.saves.voteDataJsonUrl(currentSaveID), function(data) {
				
				// Parse dates and numbers.
				data.votes.forEach(function(d) {
					d.date = new Date(d.date*1000);//parse(d.date);
					d.value = +d.value;
				});
				data.dupVotes.forEach(function(d) {
					d.Date = new Date(d.Date*1000);//parse(d.date);
				});

				if (data.dupVotes.length)
				{
					var dupVotesDiv = $('<div></div>').addClass("DupVotes");
					$('<h4>Suspicious votes (<a>see map</a>)</h4>').appendTo(dupVotesDiv).find('a').attr('href',tptenhance.saves.voteMapUrl(currentSaveID));
					var dupVotesTbl = $('<table cellspacing="0" cellpadding="0"><thead><tr><th>Date</th><th>Username</th><th>IP address</th><th>&nbsp;</th></tr></thead><tbody></tbody></table>').appendTo(dupVotesDiv);
					var dupVotesTblBody = dupVotesTbl.find('tbody');
					var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
					var dupVotes = data.dupVotes.sort(function(a,b){return (+b.Date)-(+a.Date);});
					var ipcolours = {};
					var iplist = [];
					dupVotes.forEach(function(d) {
						if (typeof ipcolours[d.SourceAddress] == "undefined")
						{
							ipcolours[d.SourceAddress] = "";
							iplist.push(d.SourceAddress);
						}
					});
					if (iplist.length>1)
					{
						var hueStep = 340/iplist.length;
						for (var i=0; i<iplist.length; i++)
						{
							ipcolours[iplist[i]] = 'hsl('+(hueStep*i)+',50%,80%)';
						}
					}
					dupVotes.forEach(function(d) {
						var tableRow = $('<tr></tr>');
						var cell;
						cell = $('<td><a></a></td>').addClass('Date').appendTo(tableRow);
						var timeString = [('0'+d.Date.getHours()).slice(-2), ('0'+d.Date.getMinutes()).slice(-2), ('0'+d.Date.getSeconds()).slice(-2)].join(':');
						cell.text([d.Date.getDate(), months[d.Date.getMonth()], d.Date.getFullYear(), timeString].join(' '));
						cell = $('<td><a></a></td>').addClass('Username').appendTo(tableRow);
						cell.children().first().attr('href', tptenhance.users.moderationUrlById(d.UserID)).text(d.Username);

						/*
						// This is a bootstrap tooltip, not the jquery tooltip plugin
						var hoverTimeout = false;
						var hovered = false;
						cell.on("mouseleave", function(){
							hovered = false;
							if (hoverTimeout!==false)
							{
								clearTimeout(hoverTimeout);
								hoverTimeout = false;
							}
						});
						cell.on("mouseenter", function(evt, ui){
							hovered = true;
							var that = $(this);
							if (hoverTimeout===false)
							{
								hoverTimeout = setTimeout(function(){
									hoverTimeout = false;
									that.off("mouseenter");
									tptenhance.users.getModerationInfoById(d.UserID, function(data){
										var txt = "";
										if (data.Banned && data.Bans[0].Duration==0) txt += "Perm banned";
										else
										{
											if (data.Banned)
											{
												txt += "Temp banned";
												if (data.Bans.length>1)
												{
													txt += ", "+(data.Bans.length-1)+" previous ban";
													if (data.Bans.length>2) txt += "s";
												}	
											}
											else
											{
												txt += "Not currently banned";
												if (data.Bans.length>0)
												{
													txt += ", "+data.Bans.length+" previous ban";
													if (data.Bans.length>1) txt += "s";
												}
											}
										}
										
										txt += "<br>";
										if (!data.Comments.length && !data.Tags.length)
											txt += "No tags or comments";
										else
										{
											txt += data.Tags.length+" tags, ";
											if (data.Comments.length>=10)
												txt += "many comments";
											else
												txt += data.Comments.length+" comments";
										}
										// TODO: saves?
										that.tooltip({title:txt, placement:"left"});
										if (hovered) that.tooltip("show");
									});
								}, 50);
							}
						});*/
						
						cell = $('<td><a></a></td>').addClass('IPAddress').appendTo(tableRow);
						cell.children().first().attr('href', tptenhance.IPMapUrl(d.SourceAddress)).text(d.SourceAddress);
						if (iplist.length>1)
						{
							cell.on("mouseenter",function(){
								var target = $(this).find("a").text();
								$(this).parents("tbody").find("td.IPAddress").each(function(){
									if ($(this).find("a").text() == target)
										$(this).addClass("highlight");
									else
										$(this).removeClass("highlight");
								});
							});
							cell.on("mouseleave",function(){
								$(this).parents("tbody").find("td.IPAddress").removeClass("highlight");
							});
						}
						if (typeof ipcolours[d.SourceAddress] != "undefined" && ipcolours[d.SourceAddress] != "")
							cell.css('background-color', ipcolours[d.SourceAddress]);
						cell = $('<td></td>').addClass('VoteType');
						if (d.Vote==1) cell.html('<i class="VoteUpIcon icon-chevron-up icon-white"></i>');
						else if (d.Vote==-1) cell.html('<i class="VoteDownIcon icon-chevron-down icon-white"></i>');
						else cell.html('&nbsp;');
						cell.appendTo(tableRow);
						dupVotesTblBody.append(tableRow);
					});
					$("#VoteGraph").append(dupVotesDiv);
				}

				x.domain([d3.min(data.votes, function(d) { return d.date; }), d3.max(data.votes, function(d) { return d.date; })]);
				var ydomain = d3.extent(data.votes, function(d) { return d.value; });
				if (ydomain[0]>0) ydomain[0] = 0;
				y.domain(ydomain);

				rect.call(d3.behavior.zoom().x(x).on("zoom", zoom));

				// Bind the data to our path elements.
				svg.select("path.area").data([data.votes]);
				svg.select("path.line").data([data.votes]);

				function voteMouseover(d) {
					//d.classed("active", true);
					svg.selectAll(".dupVLine").classed("active", function(p) { return p.SourceAddress === d.SourceAddress; });
				}

				function voteMouseout() {
					svg.selectAll(".active").classed("active", false);
					//info.text(defaultInfo);
				}				  
				  
				dupVLine = voteLines.selectAll("line.link")
				.data(data.dupVotes);

				var lineG = dupVLine.enter().insert("svg:g")
				.attr("class", function(d) { return "dupVLine"+d.Vote+" dupVLine"; })
				.on("mouseover", voteMouseover)
				.on("mouseout", voteMouseout);

				lineG.append("line")
				.attr("x1", 0).attr("x2", 0).attr("y1", h).attr("y2", -5);

				lineG.append("text")
				.attr("text-anchor", "middle")
				.attr('font-size', 11)
				.attr("dy", ".1em")
				.text(function(d) { return d.Username; });

				lineG.append("text")
				.attr("text-anchor", "middle")
				.attr('font-size', 11)
				.attr("dy", ".1em")
				.attr("transform", "translate(0, 14)")
				.text(function(d) { return d.SourceAddress; });

				//.x1(function(d) { return x(d.Date); })
				//.y1(function(d) { return y(100); });
				//.style("stroke-width", function(d) { return Math.sqrt(d.value); });

				dupVLine.exit().remove();
			
		/*link.enter().insert("svg:line", ".node")
			.attr("class", "link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });
			
		link.exit().remove();*/
				
				  draw();
				});
				
				function draw() {
					svg.select("g.x.axis").call(xAxis);
					svg.select("g.y.axis").call(yAxis);
					svg.select("path.area").attr("d", area);
					svg.select("path.line").attr("d", line);
					/*dupVLine.attr("x1", function(d) { return x(d.Date); })
						.attr("y1", function(d) { return h; })
						.attr("x2", function(d) { return x(d.Date); })
						.attr("y2", function(d) { return -5; });*/
					dupVLine.attr("transform", function(d) { return "translate("+x(d.Date)+", 0)"; });
					//svg.select("dupVotes.line").attr();
				}

				// Using a timeout here to defer drawing seems to improve zooming in Firefox on slow computers
				// Possibly multiple calls to zoom are issued simultaneously depending on the amount of
				// scroll wheel movement, and unnecessary redraws occur. The setTimeout defers drawing, 
				// hopefully until after all zoom calls occur.
				var zoomDrawTimeout = false;
				function zoomDraw() {
					zoomDrawTimeout = false;
					draw();
				}
				function zoom() {
					//d3.event.transform(x); // TODO d3.behavior.zoom should support extents
					if (zoomDrawTimeout===false) zoomDrawTimeout = setTimeout(zoomDraw, 1);
				}
			}
		},
		users:{
			moderationUrlById:function(id)
			{
				return "/User/Moderation.html?ID="+encodeURIComponent(id);
			},
			profileUrlById:function(id)
			{
				return "/User.html?ID="+encodeURIComponent(id);
			},
			parseModerationPage:function(html)
			{
				html = $(html).find(".Page");
				var data = {};
				data.Banned = (html.find(".UnBanUser").length>0);
				data.KnownAddresses = [];
				html.find(".KnownAddresses a").each(function(){data.KnownAddresses.push($(this).text());});
				data.Comments = [];
				html.find(".MessageList .Post").each(function(){
					var comment = $(this);
					data.Comments.push({
						SaveID: +comment.find(".SaveInfo a").text(),
						date: comment.find(".Date").text(),
						CommentID: +comment.find(".Actions a").attr("href").match(/DeleteComment=[0-9]+/)[0].split("=")[1],
						Message: comment.find(".Message").html()
					});
				});
				data.Bans = [];
				html.find(".BanHistory li").each(function(){
					var ban = $(this);
					var h6 = ban.find("h6").text().split(", ");
					var otherText = ban.clone();
					otherText.children().remove();
					otherText = otherText.text().split("\"");
					var duration = otherText.shift().replace("\s+$","").toLowerCase();
					if (duration.indexOf("permanently")!=-1 || duration.indexOf("permenantly")!=-1)
						duration = 0;
					else if (duration.indexOf("hour")!=-1)
						duration = 60*60*(+duration.split(" ")[0]);
					else if (duration.indexOf("day")!=-1)
						duration = 60*60*24*(+duration.split(" ")[0]);
					else if (duration.indexOf("week")!=-1)
						duration = 60*60*24*7*(+duration.split(" ")[0]);
					else if (duration.indexOf("month")!=-1)
						duration = 60*60*24*7*4*(+duration.split(" ")[0]); // 4 weeks seems right, e.g. a ban reported on IRC as 67200 hours shows as 100 months
					otherText.pop();
					data.Bans.push({
						date: h6[0],
						By: h6[1],
						Reason: otherText.join("\""),
						Duration: duration
					});
				});
				data.Tags = [];
				html.find(".TagText").each(function(){ data.Tags.push($(this).text()); });
				data.SaveDeletions = +$(html.find(".Record .Information")[1]).text().match(/[0-9]+/)[0];
				return data;
			},
			getModerationInfoById:function(id,callback)
			{
				$.get(tptenhance.users.moderationUrlById(id), function(data){
					callback(tptenhance.users.parseModerationPage(data));
				}, "html");
			}
		},
		IPMapUrl:function(ip)
		{
			return "/IPTools.html?IP="+encodeURIComponent(ip);
		}
	}


	// Override tag info popups, and add them to the user moderation page
	// The overridden version has links to delete (instead of disabling) tags, and disabling+deleting is done in an Ajax request (no full page reload)
	if (window.location.toString().indexOf("/User/Moderation.html")!=-1)
	{
		$(document).ready(function(){setTimeout(function(){
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
			
			/*
			 * Existing submit hook:
		if(reason.length < 2){
			alert("Please provide a ban reason");
			return false;
		}
		if(timespan.length > 0 && !isNumber(timespan)) {
			alert("Ban time must be a number");
			return false;	
		}
		if(parseFloat(timespan) < 0 || timetype == "p"){
			return confirm("Are you sure you want to permanently ban this user, all the user's saves will be locked.");
		}
			* 
			* This is replaced by the function below because:
			* a) It's buggy. timespan=0 or timespan="" produces a perm ban without confirmation. 
			* b) confirm isn't really necessary if several actions (changing the timespan dropdown value and clicking the ban button) have already been taken to indicate that yes, a perm ban is desired. 
			*    Yeah, maybe an accidental perm ban while mashing keyboard or cat-on-keyboard is still possible, but I think it's sufficiently unlikely. 
			*    The confirm() is a particular nuisance when trying to perm ban lots of accounts simultaneously for multiple account voting. 
			*    Also, since pressing enter means submit for forms and OK for confirm dialogs, the confirm doesn't necessarily help if the enter button is accidentally pressed and gets stuck, or is trodden on by a cat.
			*/
			$(".BanUser form").off('submit').on('submit', function(e){
				// Try to prevent accidental perm bans
				var form = $(".BanUser form");
				var banReason = form.find('input[name="BanReason"]').val();
				var banTimeType = form.find('select[name="BanTimeSpan"]').val();
				var banTime = form.find('input[name="BanTime"]').val();
				if (banTimeType!="p")
				{
					if (banTime.toString() != (+banTime).toString() || (+banTime)<=0 || (+banTime)!=(+banTime))
					{
						alert("Enter a ban time, or select 'Perm' from the dropdown box");
						e.preventDefault();
						return false;
					}
					else if (banReason == "Ban Reason" || banReason.length < 2)
					{
						alert("Enter a ban reason");
						e.preventDefault();
						return false;
					}
				}
			});
		},1);});
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
			window.showSaveVotes = tptenhance.saves.showVotes;
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
			$("#AddReplyMessage").addClass("EditWYSIWYG");
			tptenhance.wysiwygLoaded = 0;
			var wysiwygPrepare = function()
			{
				tptenhance.wysiwygLoaded++;
				if (tptenhance.wysiwygLoaded>=2)
				{
					WYSIWYG('#AddReplyMessage, textarea[name="Post_Message"], textarea[name="Thread_Message"]');
					window.GetRef = function(Username, PostID){
						$('html, body').animate({scrollTop: $(document).height()}, 200);
						$("#AddReplyMessage.EditPlain").insertAtCaret("@"+Username+"!"+PostID+"\n");
						$("#AddReplyMessage.EditWYSIWYG").tinymce().execCommand('mceInsertContent',false, "<p>@"+Username+"!"+PostID+"</p><p></p>");
					}
					window.GetQuote = function(PostID, Element, Username){
						$('html, body').animate({scrollTop: $(document).height()}, 200);
						$.get("/Groups/Thread/Post.json?Type=Raw&Post="+PostID, function(data){
							if(data.Status==1){
								$("#AddReplyMessage.EditPlain").insertAtCaret("<p><cite>"+Username+"</cite>:</p><blockquote>"+data.Post+"</blockquote>");
								$("#AddReplyMessage.EditWYSIWYG").tinymce().execCommand('mceInsertContent',false, "<p><cite>"+Username+"</cite>:</p><blockquote>"+data.Post+"</blockquote><p>&nbsp;</p>");
							} else {
								$("#AddReplyMessage.EditPlain").insertAtCaret("<p><cite>"+Username+"</cite>:</p><blockquote>"+$("#"+Element).text()+"</blockquote>");
								$("#AddReplyMessage.EditWYSIWYG").tinymce().execCommand('mceInsertContent',false, "<p><cite>"+Username+"</cite>:</p><blockquote>"+$("#"+Element).text()+"</blockquote><p>&nbsp;</p>");
							}
						});	
					}
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
.VoteUpIcon { background-color:#0C0; border:1px solid #080; }\
.VoteDownIcon { background-color:#C00; border:1px solid #800; }\
.VoteUpIcon, .VoteDownIcon { margin-top:2px; }\
.DupVotes { margin-top: 10px; }\
.DupVotes h4 { text-align:center; margin:3px 0; }\
.DupVotes table { margin:0 auto; border:1px solid #CCC; }\
.DupVotes td, .DupVotes th { padding:3px 6px; }\
.DupVotes th { text-align:left; background-color:#DDD; }\
.DupVotes tr:nth-child(even) { background-color:#FFF; }\
.DupVotes tr:nth-child(odd) { background-color:#EFEFEF; }\
.DupVotes tr:hover { background-color:#DDF; }\
.DupVotes .IPAddress.highlight { background-color:#FFF !important; }\
'
);
if (window.location.toString().indexOf("/Groups/Thread/")!=-1)
{
	addCss('.Moderator .Author, .Administrator .Author { background-image: url("/Themes/Next/Design/Images/Shield.png"); }');
}

