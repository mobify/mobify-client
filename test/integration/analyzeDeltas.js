(function(){
	function getMean(sample) {
		return sample.reduce(function(sum, x) {
			    return sum + x;
		}) / sample.length || 0;
	}

	function formatNumber(number) {
	    number = String(number).split('.');
	    return number[0].replace(/(?=(?:\d{3})+$)(?!\b)/g, ',') +
	        (number[1] ? '.' + number[1] : '');
	}

	  /**
	   * T-Distribution two-tailed critical values for 95% confidence
	   * http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
	   */
	var tTable = {
	    '1':  12.706,'2':  4.303, '3':  3.182, '4':  2.776, '5':  2.571, '6':  2.447,
	    '7':  2.365, '8':  2.306, '9':  2.262, '10': 2.228, '11': 2.201, '12': 2.179,
	    '13': 2.16,  '14': 2.145, '15': 2.131, '16': 2.12,  '17': 2.11,  '18': 2.101,
	    '19': 2.093, '20': 2.086, '21': 2.08,  '22': 2.074, '23': 2.069, '24': 2.064,
	    '25': 2.06,  '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
	    'infinity': 1.96
	};		

	module.exports = function(timingPoints) {
		var deltas = [];
		timingPoints.forEach(function(run) {
			run.forEach(function(entry, i) {
				var lastEntry = run[(run.length + i-1) % run.length];
				var delta = Math.abs(entry[0] - lastEntry[0]);

				deltas[i] = deltas[i] || [];
				deltas[i].name = i ? entry[1] : 'Total';
				deltas[i].push(delta / 1e3);
			})
		});

		return deltas.map(function(delta) {
			delta.mean = getMean(delta);
	        // sample variance (estimate of the population variance)
	        delta.variance = delta.reduce(
        		function(sum, x) { return sum + Math.pow(x - delta.mean, 2); },
        		0
        	) / (delta.length - 1) || 0;
	        // sample standard deviation (estimate of the population standard deviation)
	        delta.sd = Math.sqrt(delta.variance);
	        // standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean)
	        delta.sem = delta.sd / Math.sqrt(delta.length);
	        // degrees of freedom
	        delta.df = delta.length - 1;
	        // critical value
	        delta.critical = tTable[Math.round(delta.df) || 1] || tTable.infinity;
	        // margin of error
	        delta.moe = delta.sem * delta.critical;
	        // relative margin of error
	        delta.rme = (delta.moe / delta.mean) * 100 || 0;

	        return '    ' + delta.name + ', avg ' + (delta.mean * 1e3).toFixed(2) + 'ms +/-'
		        + delta.rme.toFixed(2) + '%';
		}).join('\n');
	};
})();