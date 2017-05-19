/* global $ */

const itemWidth = 64;
const itemHeight = 66;
const moveMargin = 10;
let apps = [];
let hold = false;
let dragging = false;
let appsOffset;
let holdTimeout;
let groupTimeout;
let under;
let merge;
let oldPosX;
let oldPosY;
let newPos;

/**
* Get the current position of the element
* @param  {Object} elem element
* @return {number}      position
*/
function getPos(elem) {
    return parseInt(elem.attr('pos'), 10);
}

/**
* Move an element to a new position
* @param  {Object} elem element
*/
function move(elem) {
    const pos = getPos(elem);

    if (pos >= 24 && pos <= 27) {
        elem.css({ left: (pos % 4) * itemWidth, top: (Math.floor(pos / 4) * itemHeight) + 20 });
    } else {
        elem.css({ left: (pos % 4) * itemWidth, top: Math.floor(pos / 4) * itemHeight });
    }
}

/**
* Make a new group and merge overlaying elements
*/
function newGroup() {
    under.addClass('group');
    dragging = $('.dragging');
    if (!under.find('.item-anim').attr('data-name')) {
        const category = dragging.find('.icon').attr('data-cat');
        under.find('.item-anim').attr('data-name', category);
    }

    const appMin = dragging.find('.icon');
    appMin.attr('id', dragging.attr('id'));
    under.find('.item-anim').append(appMin);
    dragging.remove();

    const from = getPos(dragging);
    const to = getPos($('.item:last-child'));

    for (let i = from; i <= to; i += 1) {
        const item = $(`.item[pos="${i}"]`);
        const pos = getPos(item);
        item.attr('pos', pos - 1);
        move(item);
    }
}

/**
 * Initialize dragging mode
 * @param  {Object} e event
 */
function drag(e) {
    dragging = true;
    oldPosX = $(e.currentTarget).offset().left - e.pageX;
    oldPosY = $(e.currentTarget).offset().top - e.pageY;
    newPos = getPos($(e.currentTarget));
    $(e.currentTarget).addClass('dragging');
}

/**
* Clock system
* @param  {number} i position to start at
*/
function clock(i) {
    $('.apps').append(`<div id="${i + 4}" pos="${i}" class="item" style="left:${(i % 4) * itemWidth}px; top: ${Math.floor(i / 4) * itemHeight}px;"><div class="item-anim"><div class="icon" style="background-image: url(img/${apps[i + 4].img})" data-name="${apps[i + 4].name}" data-cat="${apps[i + 4].cat}"></div></div>`);

    if (i < apps.length - 5) {
        setTimeout(() => {
            clock(i + 1);
        }, 50);
    }
}

/**
* Reset everything
*/
function reset() {
    hold = false;
    dragging = false;
    move($('.dragging'));
    clearTimeout(holdTimeout);
    $('.dragging').removeClass('dragging');
    clearTimeout(groupTimeout);
    if (under) {
        under.removeClass('highlight-group');
    }
    merge = false;
    $('.open').removeClass('open');
    $('.blur').removeClass('blur');
}

$(global.document).ready(() => {
    appsOffset = $('.apps').offset();

    $.ajax({
        url: 'apps.json',
        success: (data) => {
            apps = data;

            for (let i = 0; i < 4; i += 1) {
                $('.apps').append(`<div id="${i}" pos="${i + 24}" class="item" style="left:${((i + 24) % 4) * itemWidth}px; top: ${(Math.floor((i + 24) / 4) * itemHeight) + 20}px;"><div class="item-anim"><div class="icon" style="background-image: url(img/${apps[i].img})" data-name="${apps[i].name}" data-cat="${apps[i + 4].cat}"></div></div>`);
            }

            clock(0);
        },
    });
});

$(global.window).on('resize', () => {
    appsOffset = $('.apps').offset();
});

$(global.document).on('mousedown', '.item', (e) => {
    hold = true;
    if (!$('.container').hasClass('draggable')) {
        holdTimeout = setTimeout(() => {
            if (hold) {
                $('.container').addClass('draggable');
                drag(e);
            }
        }, 1000);
    } else {
        drag(e);
    }
});

$(global.document).on('mouseup', () => {
    if (merge) {
        newGroup();
    }
    reset();
});

$(global.document).on('mouseenter', '.item', (e) => {
    if (dragging) {
        groupTimeout = setTimeout(() => {
            under = $(e.target).closest('.item');
            under.addClass('highlight-group');
            merge = true;
        }, 300);
    }
});

$(global.document).on('mouseleave', '.item', (e) => {
    const item = $(e.target).closest('.item');
    if (dragging && !item.hasClass('dragging')) {
        clearTimeout(groupTimeout);
        if (under) {
            under.removeClass('highlight-group');
            merge = false;
        }
    }
});

$(global.document).on('click', '.main-button', () => {
    reset();
    $('.container').removeClass('draggable');
});

$(global.document).on('click', '.group', () => {
    $(this).toggleClass('open');

    $('.container img.bg').addClass('blur');
    $('.item:not(.open)').each(() => {
        $(this).addClass('blur');
    });
});

$(global.document).on('mousemove', (e) => {
    if (dragging) {
        $('.dragging').css({ left: ((e.pageX - appsOffset.left) + oldPosX), top: ((e.pageY - appsOffset.top) + oldPosY) });

        const newX = $('.dragging').offset().left;
        const newY = $('.dragging').offset().top;
        const newRow = Math.max(Math.floor(((newY - appsOffset.top) + 20) / itemHeight), 0);

        $('.item').each((index, elem) => {
            const item = $(elem);
            const pos = getPos(item);
            const x = item.offset().left;
            const y = item.offset().top;
            const row = Math.max(Math.floor(((y - appsOffset.top) + 20) / itemHeight), 0);

            const moveLeft = (newX > x + moveMargin && newPos < pos);
            const moveRight = (newX < x - moveMargin && newPos > pos);
            const sameRow = (newRow === row);

            if (sameRow) {
                if (moveLeft || moveRight) {
                    const diff = pos - newPos;
                    const from = newPos;
                    const to = pos;
                    if (newPos > pos) {
                        for (let i = from; i >= to; i -= 1) {
                            const thisItem = $(`.item[pos="${i}"]`);
                            const thisPos = getPos(thisItem);
                            thisItem.attr('pos', thisPos + 1);
                            if (!thisItem.hasClass('dragging') || !thisItem.hasClass('moving')) {
                                move(thisItem);
                            }
                        }
                    } else if (pos > newPos) {
                        for (let i = from; i <= to; i += 1) {
                            const thisItem = $(`.item[pos="${i}"]`);
                            const thisPos = getPos(thisItem);
                            thisItem.attr('pos', thisPos - 1);
                            if (!thisItem.hasClass('dragging') || !thisItem.hasClass('moving')) {
                                move(thisItem);
                            }
                        }
                    }
                    newPos += diff;
                    $('.dragging').attr('pos', newPos);
                }
            }
        });
    }
});